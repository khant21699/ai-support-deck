// Icons drawn in one stroke weight, borrowing from proofreader's marks where a mark exists:
// the pilcrow (paragraph), a tally (count), the tick (approve), the strike-through (delete),
// the swap mark (transpose) and the caret (insert here).
type IconProps = { className?: string; size?: number };

function Svg({ children, className, size = 18 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** A marked-up queue: two lines ticked off in the margin, one still waiting. */
export const InboxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5 5.7 8.2 9 4.8M12 6.5h8M4 12.5l1.7 1.7L9 10.8M12 12.5h8M4.5 19h4M12 19h8" />
  </Svg>
);

/** The pilcrow, the paragraph mark: articles. */
export const PilcrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 4H9.5a4 4 0 0 0 0 8h4M13.5 4v16M17.5 4v16" />
  </Svg>
);

/** A tally: four strokes struck through. */
export const TallyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 6v12M9.5 6v12M13.5 6v12M17.5 6v12M3.5 16 20.5 8" />
  </Svg>
);

/** The caret: insert here. Used for editing. */
export const CaretIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 15.5 12 7l6 8.5M4.5 19.5h15" />
  </Svg>
);

/** The transposition mark: swap this for another version. Used for regenerate. */
export const SwapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 8.5h11M12.5 5.5l3 3-3 3M19.5 15.5h-11M11.5 12.5l-3 3 3 3" />
  </Svg>
);

/** A struck-through line of text: reject. */
export const StrikeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M6.5 7.5h4M13.5 7.5h4M6.5 16.5h4M13.5 16.5h4" />
  </Svg>
);

/** The tick: approved. */
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

export const LogOutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3.5M15.5 8l4 4-4 4M19.5 12h-10" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 3 19.5h18L12 4Z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Svg>
);
