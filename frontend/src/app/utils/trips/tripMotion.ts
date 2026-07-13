export const SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 28,
  mass: 0.9,
};

export const MOTION_DURATION = {
  fast: 0.18,
  normal: 0.32,
  slow: 0.55,
  reveal: 0.7,
} as const;

export const MOTION_EASE = {
  smooth: "cubic-bezier(0.32,0.72,0,1)",
  snappy: "cubic-bezier(0.16,1,0.3,1)",
  bounce: "cubic-bezier(0.34,1.56,0.64,1)",
} as const;
