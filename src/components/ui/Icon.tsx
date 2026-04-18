import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  star: "M12 3l2.7 6 6.3.9-4.5 4.4 1 6.2L12 17.8 6.5 20.5l1-6.2L3 9.9l6.3-.9z",
  bell: "M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 20a2 2 0 0 0 4 0",
  check: "M5 12l4 4 10-10",
  flag: "M5 21V4h12l-2 4 2 4H5",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  sparkle: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z",
  inbox: "M4 13l2-7h12l2 7M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  file: "M7 3h7l5 5v13H7zM14 3v5h5",
  gear: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM19.4 12l1.6-1-2-3.5-1.8.7a7 7 0 0 0-1.7-1L15 5h-4l-.5 2.2a7 7 0 0 0-1.7 1l-1.8-.7-2 3.5L6.6 12l-1.6 1 2 3.5 1.8-.7a7 7 0 0 0 1.7 1L11 19h4l.5-2.2a7 7 0 0 0 1.7-1l1.8.7 2-3.5z",
  gavel: "M14 2l6 6-3 3-6-6zM11 5L4 12l3 3 7-7M9 17l-5 5M14 22l5-5",
  building: "M4 21V6l8-3 8 3v15M9 10h2M13 10h2M9 14h2M13 14h2M9 18h2M13 18h2",
  star_filled: "M12 2l2.9 6.5 7.1 1-5.2 5 1.2 7L12 18.3 6 21.5l1.2-7L2 9.5l7.1-1z",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof PATHS;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled = false, ...rest }: IconProps) {
  const key = filled && PATHS[`${name}_filled`] ? `${name}_filled` : name;
  const d = PATHS[key] ?? PATHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
