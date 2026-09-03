type IconProps = { className?: string };

const base = 'h-[18px] w-[18px]';
const svg = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: `${base} ${className ?? ''}`,
});

export const DashboardIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <path d="M4 5h16M4 11h10M4 17h7" />
    <circle cx="18.5" cy="16.5" r="2.5" />
  </svg>
);

export const ScheduleIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <rect x="3" y="5" width="18" height="16" rx="1.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const PlayersIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 11a3 3 0 0 0 0-6M17.5 20a5.5 5.5 0 0 0-2-4.3" />
  </svg>
);

export const FinanceIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <path d="M4 19V9M9.5 19V5M15 19v-7M20.5 19v-4" />
    <path d="M3 21h18" />
  </svg>
);

export const ProfileIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

export const AccountsIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <circle cx="10" cy="8" r="3.2" />
    <path d="M4 20a6 6 0 0 1 12 0" />
    <path d="M18 8v6M15 11h6" />
  </svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronRight = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const PinIcon = ({ className }: IconProps) => (
  <svg {...svg(className)}>
    <path d="M15 3l6 6-3 1-4 4-1 5-6-6 5-1 4-4z" />
    <path d="M8 16l-4 5" />
  </svg>
);
