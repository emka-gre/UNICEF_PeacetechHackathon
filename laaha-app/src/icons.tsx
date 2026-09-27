// Small line icons (stroke uses currentColor so they follow the text colour).

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const ReportIcon = () => (
  <svg {...base}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const PinIcon = () => (
  <svg {...base}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const PhoneIcon = () => (
  <svg {...base}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);

export const GearIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const CameraIcon = () => (
  <svg {...base}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

export const CheckIcon = ({ size = 22 }: { size?: number }) => (
  <svg {...base} width={size} height={size} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.6-9.2-9.4A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 9.2 4.2C19.5 15.4 12 20 12 20z" />
  </svg>
);

export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const UsersIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
  </svg>
);

export const FlameIcon = () => (
  <svg {...base}>
    <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-3 2-5 5-4.5 8-1.3-.6-2-1.8-2.2-3C5.9 10.1 5.5 12.3 5.5 14.5A6.5 6.5 0 0 0 12 21z" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg {...base} strokeWidth={2.2}>
    <path d="m14.5 5-7 7 7 7" />
  </svg>
);

export const ComposeIcon = () => (
  <svg {...base}>
    <path d="M20 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1.5-1.5H11" />
    <path d="M17.6 3.6a2 2 0 0 1 2.8 2.8L12 14.8l-3.6.8.8-3.6z" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
  </svg>
);

export const PushpinIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M9 3.5h6l-1 5.5 3.5 3.5v1.5h-11V12.5L10 9z" />
    <path d="M12 14v6.5" />
  </svg>
);
