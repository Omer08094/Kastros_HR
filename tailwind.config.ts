import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kastros: {
          forest: "#14342F",
          pine: "#1B4332",
          sage: "#52796F",
          mist: "#84A98C",
          cream: "#F4F1EA",
          sand: "#E8E3D8",
          amber: "#D4A574",
          ink: "#0D1F1C",
          /** Wordmark palette (kastros.co / logo) */
          brandBlue: "#2B3990",
          brandBlueDeep: "#243d6b",
          brandGreen: "#006837",
          brandGreenDark: "#005530",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(20, 52, 47, 0.12)",
        card: "0 1px 3px rgba(13, 31, 28, 0.08), 0 8px 24px -8px rgba(20, 52, 47, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
