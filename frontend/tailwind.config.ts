import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#071525",
          900: "#0b1f35",
          800: "#133454",
        },
        ink: "#15253a",
        mist: "#f5f7fa",
        teal: "#14b8a6",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.035)",
      },
    },
  },
  plugins: [],
} satisfies Config;

