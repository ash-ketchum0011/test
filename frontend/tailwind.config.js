module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0D14",
        slatebg: "#111622",
        card: "#161C2B",
        cardhover: "#1D2538",
        subtle: "#232D42",
      },
      fontFamily: {
        head: ["Outfit", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
