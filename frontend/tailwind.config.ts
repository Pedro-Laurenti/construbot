const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mylight: {
          primary: "#00a884",
          "primary-content": "#ffffff",
          secondary: "#f0f2f5",
          "secondary-content": "#3b4a54",
          accent: "#009de2",
          "accent-content": "#ffffff",
          neutral: "#3b4a54",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f0f2f5",
          "base-300": "#e8e9ec",
          "base-content": "#3b4a54",
          info: "#009de2",
          success: "#00a884",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      {
        mydark: {
          primary: "#00a884",
          "primary-content": "#ffffff",
          secondary: "#2a3942",
          "secondary-content": "#e9edef",
          accent: "#53bdeb",
          "accent-content": "#ffffff",
          neutral: "#111b21",
          "neutral-content": "#e9edef",
          "base-100": "#111b21",
          "base-200": "#0b141a",
          "base-300": "#202c33",
          "base-content": "#e9edef",
          info: "#53bdeb",
          success: "#00a884",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
    ],
    logs: false,
  },
};

export default config;
