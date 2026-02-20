module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0C0C",
        cream: "#F7F3EE",
        mint: "#2EC4B6",
        coral: "#FF6B6B",
        sun: "#FFBF69",
        fog: "#E2E8F0",
        midnight: "#1A1B26"
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 40px rgba(12, 12, 12, 0.12)",
        tight: "0 8px 24px rgba(12, 12, 12, 0.16)"
      },
      borderRadius: {
        card: "20px",
        soft: "12px"
      }
    }
  },
  plugins: []
};
