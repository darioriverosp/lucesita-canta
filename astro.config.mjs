import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // Los estilos van dentro del HTML: la página se dibuja sin esperar a otro archivo
  build: { inlineStylesheets: 'always' },
});
