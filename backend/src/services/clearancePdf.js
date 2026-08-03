const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const jpeg = require("jpeg-js");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const TEMPLATE_PATH = path.resolve(__dirname, "../../assets/clearance-form-template.pdf");
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");

/**
 * Hand-calibrated against backend/assets/clearance-form-template.pdf (the
 * scanned "إخلاء طرف" paper form, single page, 1708x2616pt). Row keys match
 * `ClearanceRequest.departments[].order` (1-13, same as the paper's row
 * numbers top-to-bottom). Derived from just the table's outer top edge
 * (row 1's top, 1781.3pt) and a single row height (85.8pt), rather than 13
 * independently-eyeballed row boundaries -- an earlier per-row estimate
 * (81.3pt) was close at the top but drifted about half a row off by row 13,
 * confirmed by overlaying debug rectangles on the actual scan and comparing
 * against the real grid lines. Re-derive both numbers the same way (render
 * at 300dpi, overlay red boxes at candidate coordinates, compare against the
 * real top and bottom table borders, adjust row height until both ends
 * line up) if a different/cleaner scan ever replaces this template.
 */
const TABLE_TOP = 1781.3;
const ROW_HEIGHT = 85.8;
const ROWS = {};
for (let i = 1; i <= 13; i++) {
  const yTop = TABLE_TOP - (i - 1) * ROW_HEIGHT;
  ROWS[i] = { yTop, yBottom: yTop - ROW_HEIGHT };
}

// Only the name and signature columns are used -- the reviewer who signed
// off goes in the left ("الاسم") column on every signed row (this is a
// signer's-name column on the real paper form, not a repeat of whose
// clearance it is), the evidence photo goes in the middle ("التوقيع")
// column, and the right ("البيان") column is deliberately left blank.
const COLUMNS = {
  name: { x: 196.2, width: 562.5 - 196.2 },
  signature: { x: 562.5, width: 771.9 - 562.5 },
};

const CELL_PADDING = 6;
const IMAGE_PADDING = 2;

// A real evidence photo is a signature photographed/scanned on plain paper --
// it has a white/off-white background, not transparency, so embedding it
// as-is would stamp an opaque rectangle over the printed form instead of
// looking like an actual signature on the page. This decodes to raw RGBA,
// makes near-white pixels transparent (with a soft-edged band around the
// threshold so ink strokes don't get a hard jagged cutout), and re-encodes
// as PNG so pdf-lib can embed it with transparency regardless of the
// original upload format.
function stripNearWhiteBackground({ width, height, data }) {
  const WHITE = 235; // pixels this light or lighter become fully transparent
  const INK = 180; // pixels this dark or darker stay fully opaque
  for (let i = 0; i < data.length; i += 4) {
    const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
    let alpha;
    if (minChannel >= WHITE) alpha = 0;
    else if (minChannel <= INK) alpha = 255;
    else alpha = Math.round((255 * (WHITE - minChannel)) / (WHITE - INK));
    data[i + 3] = Math.min(data[i + 3], alpha);
  }
  const png = new PNG({ width, height });
  data.copy(png.data);
  return PNG.sync.write(png);
}

function decodeToRgba(bytes, mimeType) {
  if (/png/i.test(mimeType)) {
    const png = PNG.sync.read(bytes);
    return { width: png.width, height: png.height, data: png.data };
  }
  const decoded = jpeg.decode(bytes, { useTArray: true });
  return { width: decoded.width, height: decoded.height, data: Buffer.from(decoded.data) };
}

async function drawEvidenceImage(pdfDoc, page, evidence, row) {
  const absolutePath = path.join(UPLOAD_ROOT, evidence.fileUrl);
  if (!fs.existsSync(absolutePath)) return;

  // Only image evidence gets composited into the signature cell -- a PDF
  // upload is still stored/servable via GET .../evidence, but embedding an
  // arbitrary uploaded PDF's page into this one is out of scope for v1.
  if (!/^image\/(jpe?g|png)$/i.test(evidence.mimeType)) return;

  const bytes = fs.readFileSync(absolutePath);
  let image;
  try {
    const rgba = decodeToRgba(bytes, evidence.mimeType);
    const transparentPng = stripNearWhiteBackground(rgba);
    image = await pdfDoc.embedPng(transparentPng);
  } catch (err) {
    // A corrupt/truncated upload shouldn't take down PDF generation for the
    // whole request -- just skip embedding this row's image.
    console.error(`[clearancePdf] failed to embed evidence image at ${absolutePath}:`, err.message);
    return;
  }

  const cell = COLUMNS.signature;
  const maxWidth = cell.width - IMAGE_PADDING * 2;
  const maxHeight = row.yTop - row.yBottom - IMAGE_PADDING * 2;
  // No upscale cap -- fill as much of the cell as the aspect ratio allows.
  // Evidence photos are typically much higher-resolution than the cell
  // needs anyway (phone camera vs. an ~80pt-tall box), but small synthetic
  // test images should still grow to fill the space rather than sit tiny
  // in a corner.
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: cell.x + (cell.width - width) / 2,
    y: row.yBottom + (row.yTop - row.yBottom - height) / 2,
    width,
    height,
  });
}

// Centered both ways in the cell, and shrinks to fit before it ever
// truncates -- at a fixed small size (the original 8pt, left-pinned to the
// cell's edge) a short name looked lost in a much bigger cell with no
// visual relationship to it.
function drawCellText(page, font, text, column, row, { size = 20 } = {}) {
  if (!text) return;
  const maxWidth = column.width - CELL_PADDING * 2;

  let fitSize = size;
  while (fitSize > 7 && font.widthOfTextAtSize(text, fitSize) > maxWidth) {
    fitSize -= 1;
  }

  const displayText = font.widthOfTextAtSize(text, fitSize) > maxWidth
    ? `${text.slice(0, Math.max(1, Math.floor((maxWidth / font.widthOfTextAtSize(text, fitSize)) * text.length)))}…`
    : text;
  const displayWidth = font.widthOfTextAtSize(displayText, fitSize);

  page.drawText(displayText, {
    x: column.x + (column.width - displayWidth) / 2,
    y: row.yBottom + (row.yTop - row.yBottom) / 2 - fitSize / 3,
    size: fitSize,
    font,
    color: rgb(0.05, 0.35, 0.2),
  });
}

/**
 * Composites whatever signature evidence a request has collected so far
 * onto the master paper-form template. Safe to call on a partially-signed
 * request (unsigned rows are simply left blank) -- the same function
 * produces the final version once every department is complete.
 */
async function generateClearancePdf(request) {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const dept of request.departments) {
    const row = ROWS[dept.order];
    if (!row) continue;

    let evidence = null;
    let signerName = null;
    if (dept.signatureMode === "single") {
      if (dept.status !== "completed") continue;
      // Evidence can be missing on an otherwise-completed department (e.g.
      // an older seeded request marked "completed" without attaching a real
      // upload) -- still show the row as signed, just skip the image itself
      // rather than dropping the whole row.
      evidence = dept.evidence;
      signerName = dept.signedByFullName;
    } else {
      // Itemized (IT): only composite once every item is signed, using the
      // most recent signature as the row's representative evidence -- the
      // row-per-department paper form only has room for one image, so this
      // is the closest analog to "IT signed off."
      const allSigned = dept.items.length > 0 && dept.items.every((i) => i.status === "completed");
      if (!allSigned) continue;
      const latest = [...dept.items].sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt))[0];
      evidence = latest?.evidence;
      signerName = latest?.signedByFullName;
    }

    if (evidence) await drawEvidenceImage(pdfDoc, page, evidence, row);
    // Left column identifies who signed off, not whose clearance this is --
    // the paper's own top-of-form employee fields aren't filled in by this
    // generator, but the "الاسم" column next to each department's row is a
    // signer-name column on the real form.
    drawCellText(page, font, signerName, COLUMNS.name, row);
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { generateClearancePdf };
