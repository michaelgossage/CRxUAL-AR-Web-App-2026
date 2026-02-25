import { defineConfig } from "vite";
import fs from "node:fs";

export default defineConfig({
  base: "/CRxUAL-AR-Web-App-2026/",
  server: {
    host: true,
    https: {
      key: fs.readFileSync("localhost+2-key.pem"),
      cert: fs.readFileSync("localhost+2.pem")
    }
  }
});
