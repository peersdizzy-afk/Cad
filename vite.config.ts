import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` must match the repo name when deploying to GitHub Pages
// (https://<user>.github.io/Cad/). Override at build time with BASE_PATH if needed.
const base = process.env.BASE_PATH ?? "/Cad/";

export default defineConfig({
  plugins: [react()],
  base,
  server: { host: true, port: 5173 },
});
