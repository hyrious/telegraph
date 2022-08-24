import { batch } from "@hyrious/utils";
import { watch } from "chokidar";
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "fs";
import { createServer } from "http";
import { join, resolve } from "path";
import sade from "sade";
import sirv from "sirv";

import { version } from "../package.json";
import { parseMarkdown } from "./index";
import { compile } from "./template";
import { Post } from "./typings";

sade("tg [root]")
  .version(version)
  .describe("Static blogging site generator.")
  .example("")
  .example("username.github.io")
  .example("--watch --open")
  .option("-w, --watch", "Watch for changes and rebuild automatically")
  .action(main)
  .parse(process.argv, {
    default: {
      watch: false,
    },
  });

interface CLIOptions {
  watch: boolean;
}

function main(cwd_: string | undefined, options: CLIOptions) {
  const cwd = resolve(cwd_ || ".");

  // variables
  const src = join(cwd, "_src");

  interface Template {
    post(p: Post): string;
    index(ps: Post[]): string;
    posts_index(ps: Post[]): string;
  }

  function format_date<P extends { date: Date }>(p: P): Omit<P, "date"> & { date: string } {
    return { ...p, date: p.date.toISOString().slice(0, 10) };
  }

  const DefaultTemplate: Template = {
    post: (p) =>
      `<!DOCTYPE html><meta charset=utf8><title>${p.title}</title><body><h1>${p.title}</h1>${p.html}`,
    index: (ps) =>
      `<!DOCTYPE html><meta charset=utf8><title>Home</title><body><h1>Home</h1><ul>${
        ps
          .slice(0, 20)
          .map((p) => `<li><a href="p/${p.id}.html">${p.title}</a></li>`)
          .join("") + (ps.length > 20 ? `<li><a href="p/index.html">More</a></li>` : "")
      }</ul>`,
    posts_index: (ps) =>
      `<!DOCTYPE html><meta charset=utf8><title>Posts</title><body><h1>Posts</h1><ul>${ps
        .map((p) => `<li><a href="p/${p.id}.html">${p.title}</a></li>`)
        .join("")}</ul>`,
  };

  let site: { date: Date } = { date: new Date() };
  let posts: { [id: string]: Post | null } = {};
  let template = { ...DefaultTemplate };

  function get_posts() {
    return (Object.values(posts).filter(Boolean) as Post[]).sort((a, b) => +b.date - +a.date);
  }

  function get_last_modified_date(): Date | undefined {
    return get_posts()[0]?.date;
  }

  // streams
  const dirty = {
    style: false,
    posts: {} as { [id: string]: boolean },
    template_index: false,
    template_posts_index: false,
    template_post: false,
  };

  // actions
  const notify = batch(async function refresh() {
    if (dirty.style) {
      const input = join(src, "style.css");
      const output = join(cwd, "style.css");
      if (existsSync(input)) {
        await build({ entryPoints: [input], bundle: true, outfile: output });
      } else {
        rmSync(output, { maxRetries: 3 });
      }
      dirty.style = false;
    }

    if (dirty.template_post) {
      const input = join(src, "post.html");
      if (existsSync(input)) {
        const html = readFileSync(input, "utf-8");
        const render = compile(html, "{ site, post }");
        template.post = (post) => render({ site: format_date(site), post: format_date(post) });
      } else {
        template.post = DefaultTemplate.post;
      }
      Object.keys(dirty.posts).forEach((k) => {
        dirty.posts[k] = true;
      });
      dirty.template_post = false;
    }

    const ids = Object.keys(dirty.posts).filter((k) => dirty.posts[k]);
    ids.forEach((id) => {
      const input = join(src, `${id}.md`);
      const output = join(cwd, `p/${id}.html`);
      if (existsSync(input)) {
        const post = parseMarkdown(id, readFileSync(input, "utf-8"));
        posts[id] = post;
        mkdirSync(join(cwd, "p"), { recursive: true });
        writeFileSync(output, template.post(post));
      } else {
        posts[id] = null;
        rmSync(output, { maxRetries: 3 });
      }
      site.date = get_last_modified_date() || new Date();
      dirty.posts[id] = false;
    });

    if (dirty.template_index) {
      const input = join(src, "index.html");
      if (existsSync(input)) {
        const html = readFileSync(input, "utf-8");
        const render = compile(html, "{ site, posts }");
        template.index = (posts) => render({ site: format_date(site), posts: posts.map(format_date) });
      } else {
        template.index = DefaultTemplate.index;
      }
      writeFileSync(join(cwd, "index.html"), template.index(get_posts()));
      dirty.template_index = false;
    }

    if (dirty.template_posts_index) {
      const input = join(src, "posts-index.html");
      if (existsSync(input)) {
        const html = readFileSync(input, "utf-8");
        const render = compile(html, "{ site, posts }");
        template.posts_index = (posts) => render({ site: format_date(site), posts: posts.map(format_date) });
      } else {
        template.posts_index = DefaultTemplate.posts_index;
      }
      mkdirSync(join(cwd, "p"), { recursive: true });
      writeFileSync(join(cwd, "p/index.html"), template.posts_index(get_posts()));
      dirty.template_posts_index = false;
    }

    // ensure some files
    if (!existsSync(join(cwd, "index.html"))) {
      writeFileSync(join(cwd, "index.html"), template.index(get_posts()));
    }

    if (!existsSync(join(cwd, "p/index.html"))) {
      writeFileSync(join(cwd, "p/index.html"), template.posts_index(get_posts()));
    }
  });

  // kick start
  if (options.watch) {
    const watcher = watch(src, {
      ignored: ["**/.git/**", "**/node_modules/**"],
      disableGlobbing: true,
      ignorePermissionErrors: true,
      depth: 0,
    });

    watcher.on("add", update);
    watcher.on("change", update);
    watcher.on("unlink", update);

    function update(file: string) {
      const filename = file.slice(src.length + 1);
      if (filename === "style.css") {
        dirty.style = true;
        notify();
      } else if (filename.endsWith(".md")) {
        const id = filename.slice(0, -3);
        dirty.posts[id] = true;
        notify();
      } else if (filename === "index.html") {
        dirty.template_index = true;
        notify();
      } else if (filename === "posts-index.html") {
        dirty.template_posts_index = true;
        notify();
      } else if (filename === "post.html") {
        dirty.template_post = true;
        notify();
      }
    }

    // server, on
    const server = createServer(sirv(cwd, { dev: true })).listen(5000, () => {
      console.log("previewing at http://localhost:5000");
    });

    process.stdin.on("data", (e) => {
      if (e.toString().startsWith("q")) {
        watcher.close();
        server.close();
        process.exit();
      }
    });
  } else {
    Object.keys(dirty).forEach((k) => {
      if (typeof (dirty as any)[k] === "boolean") {
        (dirty as any)[k] = true;
      }
    });
    readdirSync(src).forEach((file) => {
      if (file.endsWith(".md")) {
        const id = file.slice(0, -3);
        dirty.posts[id] = true;
      }
    });
    notify();
  }
}
