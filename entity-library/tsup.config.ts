import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['../src/**/*.entity.temp.ts'], // Your main entry point(s)
  format: ['esm', 'cjs'], // Generate both ESM and CommonJS formats
  dts: true, // Generate TypeScript declaration files (.d.ts)
  splitting: true, // Keep everything in a single bundle per format
  sourcemap: false, // Generate source maps for easier debugging
  clean: true, // Clean the output directory before building
  bundle: false,
});
