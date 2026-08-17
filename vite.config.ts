import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    // bind every interface so a phone on the same Wi-Fi can reach the dev server
    host: true,
  },
});
