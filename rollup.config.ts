import { defineConfig } from 'rollup';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

export default defineConfig({
  treeshake: {
    moduleSideEffects: 'no-external',
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
  input: {
    index: 'src/node/index.ts',
    cli: 'src/node/cli.ts',
  },
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: 'node/[name].js',
    chunkFileNames: 'node/chunks/dep-[hash].js',
    exports: 'named',
    externalLiveBindings: false,
    freeze: false,
    sourcemap: true,
  },
  external: Object.keys(pkg.dependencies),
  plugins: [
    nodeResolve(),
    typescript({
      target: 'es2019',
      module: 'esnext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      esModuleInterop: true,
    }),
    commonjs({
      extensions: ['.js'],
    }),
    json(),
  ],
});
