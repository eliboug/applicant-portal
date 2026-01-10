// Elmseed Design System Tokens
export const colors = {
  // Primary
  elmGreenDark: "#0F2D1C",     // main hero background, headers
  elmGreen: "#1F6B3F",         // accents, links, buttons
  elmGreenLight: "#9AD18B",    // subtext, highlights, hover states
  
  // Neutrals
  offWhite: "#F7F8F6",         // page background
  white: "#FFFFFF",            // card backgrounds
  grayLight: "#E8EBE7",        // dividers, borders
  grayMid: "#B8C4BC",          // disabled states
  
  // Text
  textPrimary: "#0A0A0A",      // headings, body
  textSecondary: "#5F6F66",    // metadata, labels
  textMuted: "#8A9A90",        // placeholders
  
  // Status colors (applicant-facing)
  statusDraft: "#6B7280",
  statusSubmitted: "#2563EB",
  statusUnderReview: "#D97706",
  statusInterview: "#7C3AED",
  statusAccepted: "#059669",
  statusRejected: "#DC2626",
};

export const typography = {
  fontFamily: "'Halant', Georgia, serif",
  
  // Font weights
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightSemiBold: 600,
  
  // Font sizes
  fontSize: {
    xs: "0.75rem",      // 12px
    sm: "0.875rem",     // 14px
    base: "1rem",       // 16px
    lg: "1.125rem",     // 18px
    xl: "1.25rem",      // 20px
    "2xl": "1.5rem",    // 24px
    "3xl": "1.875rem",  // 30px
    "4xl": "2.25rem",   // 36px
    "5xl": "3rem",      // 48px
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: "0.25rem",   // 4px
  sm: "0.5rem",    // 8px
  md: "1rem",      // 16px
  lg: "1.5rem",    // 24px
  xl: "2rem",      // 32px
  "2xl": "3rem",   // 48px
  "3xl": "4rem",   // 64px
  "4xl": "6rem",   // 96px
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
};

export const borderRadius = {
  sm: "0.25rem",   // 4px
  md: "0.5rem",    // 8px
  lg: "0.75rem",   // 12px
  full: "9999px",
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};
