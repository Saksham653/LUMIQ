import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The same security headers Vercel serves in production
// (vercel.json), applied to `npm run preview` so the CSP can be
// checked locally against the real build. The dev server is left
// alone: Vite's HMR needs inline scripts that the CSP forbids.
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.groq.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true
  },
  preview: {
    headers: securityHeaders
  }
})
