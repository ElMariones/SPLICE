import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works on <user>.github.io AND
// <user>.github.io/<repo>/ without editing anything.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022' }
})
