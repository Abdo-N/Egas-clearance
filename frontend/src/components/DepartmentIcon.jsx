// Small hand-drawn line icons, one per seeded department key (see
// backend/src/seed/departments.data.js). Purely decorative -- falls back to
// a generic briefcase glyph for any future department key added there.

const paths = {
  security: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  legal: <path d="M12 3v18M8 21h8M4 7h16M4 7L2 12h4L4 7zM20 7l-2 5h4l-2-5z" />,
  medical: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  healthcare_accounts: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  library: <path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5zM20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5z" />,
  warehouses: <path d="M3 8l9-4 9 4-9 4-9-4zM3 8v9l9 4 9-4V8M12 12v9" />,
  transport: (
    <>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  hr_development: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M15.5 14.2A5 5 0 0 1 20 20" />
    </>
  ),
  illicit_gains: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  public_relations: (
    <>
      <path d="M3 10v4h3l6 4V6l-6 4H3z" />
      <path d="M14 9a4 4 0 0 1 0 6" />
    </>
  ),
  wages: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  finance: <path d="M3 21h18M5 21V10M10 21V6M15 21V13M20 21V9" />,
  it: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
};

const fallback = (
  <>
    <rect x="3" y="7" width="18" height="12" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>
);

export default function DepartmentIcon({ departmentKey, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[departmentKey] || fallback}
    </svg>
  );
}
