import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webp,svg,ico,wav,woff,woff2,ttf,otf}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      manifest: {
        id: "/",
        name: "Tic Tac Chor",
        short_name: "Tic Tac Chor",
        description:
          "A playful tic-tac-toe showdown with changing illustrated backdrops. Play offline and keep your scores on this device.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "en",
        categories: ["games", "entertainment"],
        theme_color: "#fff8ed",
        background_color: "#fff8ed",
      },
      pwaAssets: { disabled: false, config: true, injectThemeColor: false },
    }),
  ],
});
