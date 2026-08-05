import { useId } from "react";

// Subtle, tiled background of thin-line corporate doodle icons (files,
// signatures, IT gear, EGAS identity marks). Pure decor: absolutely
// positioned, zero pointer-events, and drawn with `currentColor` so its
// color/opacity can be tuned per theme from CSS alone (see
// `.business-doodle-bg` in styles.css) -- no props, no state, nothing to
// wire up beyond dropping <BusinessDoodleBg /> as the first child of a
// `position: relative` page wrapper.
export default function BusinessDoodleBg() {
  const patternId = `business-doodle-${useId()}`;

  return (
    <svg className="business-doodle-bg" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={patternId} width="300" height="300" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Document */}
            <g transform="translate(30 36) rotate(-8) scale(1.2)">
              <path d="M2 1h11l5 5v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z" />
              <path d="M13 1v5h5" />
              <path d="M5 12h9M5 16h9M5 8h4" />
            </g>

            {/* Briefcase */}
            <g transform="translate(244 6) rotate(4)">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M2 13h20" />
            </g>

            {/* Clipboard */}
            <g transform="translate(148 22) rotate(6) scale(1.1)">
              <rect x="4" y="3" width="16" height="20" rx="2" />
              <rect x="8" y="1" width="8" height="4" rx="1" />
              <path d="M8 12.5l2.6 2.6L16 9.5" />
            </g>

            {/* Signature pen */}
            <g transform="translate(246 66) rotate(-12) scale(1.15)">
              <path d="M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1Z" />
              <path d="M2 23c2-1 4 1 6 0s3-2 5-1 4 1 6-1" />
            </g>

            {/* Checkmark shield */}
            <g transform="translate(56 138) rotate(10) scale(1.2)">
              <path d="M12 1l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V4Z" />
              <path d="M8 12l2.6 2.6L16 8.5" />
            </g>

            {/* Stamp */}
            <g transform="translate(190 148) rotate(-6) scale(1.1)">
              <circle cx="10" cy="8" r="6" />
              <circle cx="10" cy="8" r="2.6" />
              <path d="M10 14v4" />
              <rect x="4" y="18" width="12" height="4" rx="1" />
            </g>

            {/* Laptop */}
            <g transform="translate(16 216) rotate(5) scale(1.25)">
              <rect x="3" y="4" width="18" height="12" rx="1" />
              <path d="M1 20h22l-2-4H3l-2 4Z" />
            </g>

            {/* Server */}
            <g transform="translate(266 214) rotate(-8) scale(1.1)">
              <rect x="4" y="3" width="16" height="6" rx="1" />
              <rect x="4" y="11" width="16" height="6" rx="1" />
              <circle cx="7.4" cy="6" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="7.4" cy="14" r="0.75" fill="currentColor" stroke="none" />
            </g>

            {/* Network node */}
            <g transform="translate(114 196)">
              <circle cx="12" cy="12" r="2.4" />
              <circle cx="4" cy="5" r="1.8" />
              <circle cx="20" cy="5" r="1.8" />
              <circle cx="4" cy="19" r="1.8" />
              <circle cx="20" cy="19" r="1.8" />
              <path d="M12 12L4 5M12 12L20 5M12 12L4 19M12 12L20 19" />
            </g>

            {/* Data chart */}
            <g transform="translate(196 266) rotate(8) scale(1.15)">
              <path d="M2 1v20M2 21h20" />
              <path d="M6.5 21v-6M12 21v-11M17.5 21v-4" />
            </g>

            {/* Flame / gas symbol */}
            <g transform="translate(86 266) rotate(-5) scale(1.2)">
              <path d="M12 22a7 7 0 0 0 7-7c0-3.2-2.2-5.6-3.4-7.8 0 2.2-1.1 3.3-2.2 3.3 0-2.2 1.1-4.4-1.1-7.7-2.2 3.3 0 5.5-2.2 7.7-1.1 1.1-2.1 2.3-2.1 4.5a7 7 0 0 0 4 6Z" />
            </g>

            {/* User profile badge */}
            <g transform="translate(146 104) rotate(-4) scale(1.05)">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="12" cy="9.5" r="3" />
              <path d="M6 18c1.5-3 4-4 6-4s4.5 1 6 4" />
            </g>
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
