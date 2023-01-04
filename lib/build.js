import os from 'node:os'
import v8 from 'node:v8'
import fs from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'
import { build as esbuild } from 'esbuild'
import { rimrafSync } from '@hyrious/rimraf'
import http, { default_schemes as schemes } from '@hyrious/esbuild-plugin-http'
import marked, { reset, include_katex } from './markdown.js'
import { compile } from './template.js'

/** @return {{ md: string[], css: string[], html: string[] }} */
export function prepare(root) {
  const files = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .map((dirent) => path.join(root, dirent.name))

  return files.reduce(
    (acc, file) => {
      const ext = path.extname(file)
      if (ext === '.md') {
        acc.md.push(file)
      } else if (ext === '.css') {
        acc.css.push(file)
      } else if (ext === '.html') {
        acc.html.push(file)
      }
      return acc
    },
    { md: [], css: [], html: [] },
  )
}

let cache
const cache_path = path.join(os.tmpdir(), '@hyrious-telegraph-cache')

export async function build_style(file, outdir) {
  const stats = fs.existsSync(cache_path) && fs.statSync(cache_path)
  let should_cache
  if (!cache && stats && stats.mtimeMs > fs.statSync(file).mtimeMs) {
    cache = v8.deserialize(fs.readFileSync(cache_path))
  } else {
    cache = new Map()
    should_cache = true
  }
  await esbuild({
    entryPoints: [file],
    bundle: true,
    outdir,
    plugins: [http({ schemes, cache })],
    legalComments: 'none',
  }).catch(() => process.exit(1))
  if (should_cache) {
    fs.writeFileSync(cache_path, v8.serialize(cache))
  }
}

function matter(text) {
  text = text.replace(/\r\n/g, '\n')
  if (!text.startsWith('---')) {
    return [null, text]
  }
  if (text[3] === '-') {
    return [null, text]
  }
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) {
    return [null, text]
  }
  const raw = text.slice(4, end)
  const content = text.slice(end + 5)
  return [load(raw), content]
}

class _post {
  constructor(id, title, date, text, html) {
    this.id = id
    this.title = title
    this.date = date
    this.text = text
    this.html = html
  }
}

export async function render_markdown(file) {
  const id = path.basename(file, '.md')
  const raw = fs.readFileSync(file, 'utf8')

  const [frontmatter, text] = matter(raw)
  if (typeof frontmatter !== 'object' || frontmatter === null) {
    throw new Error(`Missing frontmatter in ${id}.md`)
  }

  const { title, date, scripts } = frontmatter
  if (!title) {
    throw new Error(`Missing 'title' in frontmatter of ${id}.md`)
  }
  if (!(date && date instanceof Date)) {
    throw new Error(`Missing 'date' in frontmatter of ${id}.md`)
  }

  reset()
  let html = marked.parse(text).trimEnd()
  if (include_katex()) html = prepend_katex(html)
  if (scripts) html = append_scripts(id, html, scripts)
  return new _post(id, title, date, text, html)
}

function prepend_katex(html) {
  return '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">\n' + html
}

function append_scripts(id, html, scripts) {
  if (Array.isArray(scripts) && typeof scripts[0] === 'string') {
    return html + '\n' + scripts.map(render_script).join('\n')
  } else {
    throw new Error(`Invalid 'scripts' in frontmatter of ${id}.md, should be an array of strings`)
  }
}

function render_script(src) {
  return `<script ${src.endsWith('.mjs') ? 'type="module" ' : ''}src="${src}"></script>`
}

export function make_renderer(file) {
  return compile(file, fs.readFileSync(file, 'utf8'), '{ site, posts, post }')
}

export const build_context = {
  begin() {},
  output(p, text) {
    fs.writeFileSync(p, text)
    console.log('written', p)
  },
  style_updated(p) {
    console.log('written', p)
  },
  should_clean(p) {
    rimrafSync(p)
    fs.mkdirSync(p)
    console.log('clean', p)
  },
  end() {},
}

export async function build(root, context = build_context) {
  root = path.resolve(root || '.')
  const src = path.join(root, '_src')
  if (!fs.existsSync(src)) {
    throw new Error(`Not found _src in ${root}`)
  }
  context.begin()
  const files = prepare(src)
  const tasks = []
  for (const style of files.css) {
    tasks.push(build_style(style, root))
    context.style_updated(path.join(root, path.basename(style)))
  }
  let render_p
  let render_post
  let render_other = []
  for (const p of files.html) {
    const id = path.basename(p, '.html')
    const render = make_renderer(p)
    if (id === 'post') {
      render_post = render
    } else if (id === 'p') {
      render_p = render
    } else {
      render_other.push([id, render])
    }
  }
  if (!render_p) {
    throw new Error('Not found _src/p.html')
  }
  if (!render_post) {
    throw new Error('Not found _src/post.html')
  }
  const posts = []
  for (const p of files.md) {
    tasks.push(render_markdown(p).then((post) => posts.push(post)))
  }
  await Promise.all(tasks)
  const dest_p = path.join(root, 'p')
  context.should_clean(dest_p)
  tasks.length = 0
  posts.sort((a, b) => +b.date - +a.date)
  posts.forEach((p) => {
    p.date = p.date.toISOString().slice(0, 10)
  })
  const data = {
    site: { date: posts[0].date },
    posts,
    post: null,
  }
  for (const [id, render] of render_other) {
    const html = render(data)
    context.output(path.join(root, `${id}.html`), html)
  }
  {
    const html = render_p(data)
    context.output(path.join(dest_p, 'index.html'), html)
  }
  for (const post of posts) {
    data.post = post
    const html = render_post(data)
    context.output(path.join(dest_p, `${post.id}.html`), html)
  }
  context.end()
}
