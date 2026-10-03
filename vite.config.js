import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),svgr()],
  server: {
    host: '0.0.0.0', // บังคับให้รับ IP ภายนอก (IPv4)
    port: 5173,      // ระบุ Port ที่ต้องการ
  },
})
