import { defineConfig, minimal2023Preset as preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: "#fff8ed" } },
    apple: { ...preset.apple, resizeOptions: { background: "#fff8ed" } },
  },
  images: ["public/icon.svg"],
});
