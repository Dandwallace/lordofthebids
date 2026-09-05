/**
 * The Lord of the Bids mark: a price tag wearing a crown.
 * Drawn as inline SVG so it stays crisp and needs no network request.
 */

export function CrownTagLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Lord of the Bids">
      {/* Crown */}
      <path
        d="M6.6 12.2 5.1 6.4a.55.55 0 0 1 .85-.58l3.4 2.5 2.6-4.2a.55.55 0 0 1 .95 0l2.6 4.2 3.4-2.5a.55.55 0 0 1 .85.58l-1.5 5.8z"
        fill="#059669"
      />
      <rect x="6.2" y="12.1" width="13.4" height="1.7" rx="0.5" fill="#c8a046" />
      {/* Tag */}
      <path
        d="M14.8 14.6h9.9a3 3 0 0 1 3 3v9.9a3 3 0 0 1-3 3h-9.9a3 3 0 0 1-3-3v-9.9a3 3 0 0 1 3-3z"
        transform="rotate(-38 19.75 22.55)"
        fill="#0f1e3d"
      />
      <circle cx="23.1" cy="16.9" r="1.7" fill="#ffffff" />
    </svg>
  );
}

/* --- Icons ---------------------------------------------------------------
   One consistent set: 16px grid, 1.6 stroke, round caps. Every icon that
   carries meaning is paired with text or an accessible label.
   ------------------------------------------------------------------------ */

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="m10.4 5.6-1.2 3.6-3.6 1.2 1.2-3.6z" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.2" cy="7.2" r="4.7" />
    <path d="m10.8 10.8 3 3" />
  </Svg>
);

export const IconBookmark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 2.6h8v11l-4-2.8-4 2.8z" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.1" />
    <path d="M8 1.4v1.7M8 12.9v1.7M14.6 8h-1.7M3.1 8H1.4M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2M12.7 12.7l-1.2-1.2M4.5 4.5 3.3 3.3" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 3.5 5 4.5-5 4.5" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 2.6h4.4V7M13.4 2.6 7.5 8.5" />
    <path d="M12 9.6v3.1a.9.9 0 0 1-.9.9H3.3a.9.9 0 0 1-.9-.9V4.9a.9.9 0 0 1 .9-.9h3.1" />
  </Svg>
);

export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.4 14.4 13H1.6z" />
    <path d="M8 6.6v3M8 11.4h.01" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 7.4v3.6M8 5.2h.01" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3.2 8.4 3.2 3.2 6.4-7.2" />
  </Svg>
);

export const IconGamepad = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 5.2h5.2a3.6 3.6 0 0 1 3.5 2.8l.5 2.4a1.7 1.7 0 0 1-3.1 1.2l-.8-1.2H5.3l-.8 1.2a1.7 1.7 0 0 1-3.1-1.2l.5-2.4a3.6 3.6 0 0 1 3.5-2.8z" />
    <path d="M4.6 7.6v1.6M3.8 8.4h1.6M11 8.4h.01" />
  </Svg>
);

export const IconCalculator = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="1.6" width="9.6" height="12.8" rx="1.4" />
    <path d="M5.4 4.4h5.2M5.6 7.6h.01M8 7.6h.01M10.4 7.6h.01M5.6 10.4h.01M8 10.4h.01M10.4 10.4h.01" />
  </Svg>
);

export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.2" />
    <path d="M5.4 5.4h.01M10.6 5.4h.01M8 8h.01M5.4 10.6h.01M10.6 10.6h.01" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.2 5.4h2.2l1-1.6h5.2l1 1.6h2.2v7.2a.8.8 0 0 1-.8.8H3a.8.8 0 0 1-.8-.8z" />
    <circle cx="8" cy="9" r="2.4" />
  </Svg>
);

export const IconTool = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.4 1.9a3.6 3.6 0 0 0-3.1 5.4l-5 5a1.3 1.3 0 0 0 1.8 1.8l5-5a3.6 3.6 0 0 0 4.4-4.8l-2 2-1.6-1.6 2-2a3.6 3.6 0 0 0-1.5-.8z" />
  </Svg>
);

/** Shown where a listing has no photograph. Neutral, not an error. */
export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.6" />
    <circle cx="5.8" cy="6.4" r="1" />
    <path d="m2.6 11.2 3-2.8 2.4 2.2 2.2-2 3.2 3" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.6 6.8a5.7 5.7 0 0 0-10-2.2M2.4 9.2a5.7 5.7 0 0 0 10 2.2" />
    <path d="M13.6 2.8v4h-4M2.4 13.2v-4h4" />
  </Svg>
);
