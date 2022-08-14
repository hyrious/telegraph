import { build, Plugin } from "esbuild";
import { builtinModules } from "module";
import { dependencies } from "../package.json";

const deps = Object.keys(dependencies).concat(builtinModules);

const rewriteImport: Plugin = {
  name: "rewrite-import",
  setup({ onResolve }) {
    onResolve({ filter: /^\.\/index$/ }, (args) => {
      if (args.importer.endsWith("bin.ts")) {
        return { path: "./index.js", external: true };
      }
    });
  },
};

Promise.all([
  build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    format: "esm",
    outdir: "dist",
    external: deps,
    sourcemap: true,
  }),
  build({
    entryPoints: ["./src/bin.ts"],
    bundle: true,
    format: "esm",
    outdir: "dist",
    external: deps,
    banner: { js: "#!/usr/bin/env node" },
    plugins: [rewriteImport],
    sourcemap: true,
    sourcesContent: false,
  }),
]).catch(() => process.exit(1));
