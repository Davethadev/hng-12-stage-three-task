import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    '%VITE_TRANSLATOR_API_TOKEN%': `"${process.env.VITE_TRANSLATOR_API_TOKEN}"`,
    '%VITE_LANGUAGE_DETECTOR_API_TOKEN%': `"${process.env.VITE_LANGUAGE_DETECTOR_API_TOKEN}"`,
  }
})
