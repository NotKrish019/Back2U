import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  "extend": {
    "colors": {
      "inverse-on-surface": "#f5f0e9",
      "surface-dim": "#ded9d2",
      "on-primary-fixed": "#3f001a",
      "error-container": "#ffdad6",
      "on-error-container": "#93000a",
      "surface-container": "#f2ede6",
      "primary": "#b90a5a",
      "tertiary-fixed": "#ffdf9c",
      "retro-border": "#1A1A1A",
      "pastel-lavender": "#E4DDF7",
      "surface-container-low": "#f8f3ec",
      "error": "#ba1a1a",
      "pastel-peach": "#FFD6BE",
      "surface-container-high": "#ece7e0",
      "tertiary": "#785a00",
      "surface-bright": "#fef9f1",
      "surface-variant": "#e7e2db",
      "on-secondary-container": "#656464",
      "outline": "#8d7076",
      "hot-magenta": "#FF3366",
      "secondary": "#5f5e5e",
      "pastel-sky": "#CDE4FE",
      "tertiary-fixed-dim": "#eec054",
      "on-error": "#ffffff",
      "on-secondary-fixed-variant": "#474646",
      "on-surface": "#1d1b17",
      "secondary-fixed-dim": "#c8c6c5",
      "surface-warm-grey": "#EAE5DE",
      "inverse-surface": "#32302c",
      "tertiary-container": "#b58c23",
      "primary-fixed-dim": "#ffb1c4",
      "window-bar-gray": "#E2DDD5",
      "retro-charcoal": "#140206",
      "hot-pink": "#FF4D8D",
      "pastel-yellow-gold": "#F7C85B",
      "on-secondary-fixed": "#1c1b1b",
      "on-primary-fixed-variant": "#8f0043",
      "pastel-yellow": "#FFF2B2",
      "surface-tint": "#b90a5a",
      "surface-canvas": "#FBF9F5",
      "outline-variant": "#e1bec5",
      "surface": "#fef9f1",
      "primary-fixed": "#ffd9e0",
      "on-background": "#1d1b17",
      "inverse-primary": "#ffb1c4",
      "on-surface-variant": "#594046",
      "secondary-container": "#e5e2e1",
      "background": "#fef9f1",
      "on-primary": "#ffffff",
      "on-secondary": "#ffffff",
      "surface-container-highest": "#e7e2db",
      "on-tertiary-fixed-variant": "#5b4300",
      "primary-container": "#ff4d8d",
      "surface-container-lowest": "#ffffff",
      "on-tertiary-container": "#382800",
      "on-primary-container": "#5b0028",
      "pastel-mint": "#C4EED0",
      "surface-sand": "#F5F2EB",
      "secondary-fixed": "#e5e2e1",
      "on-tertiary": "#ffffff",
      "on-tertiary-fixed": "#251a00",
      "b2u-deep-plum": "#332653",
      "b2u-mid-plum": "#4A3B73",
      "b2u-dark-plum": "#241C3D",
      "b2u-accent-pink": "#F27D9B",
      "b2u-soft-pink": "#EFA0B5",
      "b2u-periwinkle": "#788BD8",
      "b2u-sky": "#A7D8F5",
      "b2u-lavender": "#C5B5E8",
      "b2u-white": "#FFF9FC",
      "b2u-dark": "#293052"
    },
    "borderRadius": {
      "DEFAULT": "0.125rem",
      "lg": "0.25rem",
      "xl": "0.5rem",
      "full": "0.75rem"
    },
    "spacing": {
      "space-xs": "0.25rem",
      "space-lg": "1.5rem",
      "gutter-mobile": "0.75rem",
      "space-xxl": "4rem",
      "margin-mobile": "1rem",
      "margin": "2.5rem",
      "space-md": "1rem",
      "space-xl": "2.5rem",
      "gutter": "1.5rem",
      "space-sm": "0.5rem"
    },
    "fontFamily": {
      "headline-lg": [
        "Newsreader"
      ],
      "body-lg": [
        "Work Sans"
      ],
      "headline-md": [
        "Newsreader"
      ],
      "label-code": [
        "Space Mono"
      ],
      "headline-lg-mobile": [
        "Newsreader"
      ],
      "body-md": [
        "Work Sans"
      ],
      "display-hero": [
        "Newsreader"
      ],
      "label-bracket": [
        "Space Mono"
      ],
      "display-hero-mobile": [
        "Newsreader"
      ],
      "label-caps": [
        "Space Mono"
      ],
      "headline-sm": [
        "Work Sans"
      ],
      "body-sm": [
        "Work Sans"
      ]
    },
    "fontSize": {
      "headline-lg": [
        "40px",
        {
          "lineHeight": "44px",
          "letterSpacing": "-0.015em",
          "fontWeight": "400"
        }
      ],
      "body-lg": [
        "18px",
        {
          "lineHeight": "28px",
          "fontWeight": "400"
        }
      ],
      "headline-md": [
        "28px",
        {
          "lineHeight": "34px",
          "letterSpacing": "-0.01em",
          "fontWeight": "500"
        }
      ],
      "label-code": [
        "12px",
        {
          "lineHeight": "16px",
          "letterSpacing": "0.04em",
          "fontWeight": "400"
        }
      ],
      "headline-lg-mobile": [
        "28px",
        {
          "lineHeight": "32px",
          "letterSpacing": "-0.01em",
          "fontWeight": "400"
        }
      ],
      "body-md": [
        "15px",
        {
          "lineHeight": "22px",
          "fontWeight": "400"
        }
      ],
      "display-hero": [
        "56px",
        {
          "lineHeight": "60px",
          "letterSpacing": "-0.02em",
          "fontWeight": "400"
        }
      ],
      "label-bracket": [
        "10px",
        {
          "lineHeight": "12px",
          "letterSpacing": "0.02em",
          "fontWeight": "400"
        }
      ],
      "display-hero-mobile": [
        "36px",
        {
          "lineHeight": "40px",
          "letterSpacing": "-0.01em",
          "fontWeight": "400"
        }
      ],
      "label-caps": [
        "11px",
        {
          "lineHeight": "14px",
          "letterSpacing": "0.08em",
          "fontWeight": "700"
        }
      ],
      "headline-sm": [
        "20px",
        {
          "lineHeight": "26px",
          "letterSpacing": "-0.005em",
          "fontWeight": "600"
        }
      ],
      "body-sm": [
        "13px",
        {
          "lineHeight": "18px",
          "fontWeight": "400"
        }
      ]
    }
  }
}
};
export default config;
