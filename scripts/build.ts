import esbuild from 'esbuild';
import pkg from '../package.json';

let node = esbuild.build({
  entryPoints: ['src/node/cli.ts', 'src/node/index.ts'],
  bundle: true,
  format: 'esm',
  splitting: true,
  external: Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
  }),
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  sourcemap: true,
  platform: 'node',
  outdir: 'dist/node',
  target: 'node16.15.1',
  charset: 'utf8',
});

let client = esbuild.build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'esm',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  sourcemap: 'inline',
  outdir: 'dist/client',
  target: 'es2020',
});

[node, client].forEach((task) => task.catch(() => process.exit(1)));
