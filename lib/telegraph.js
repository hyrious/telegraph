import { tmpdir } from 'node:os'
import { existsSync, readdirSync, readFileSync, promises } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

import hljs from 'highlight.js'
import katex from 'katex'
import linkify from 'marked-linkify-it'
import esbuild from 'esbuild'
import cleanStack from 'clean-stack'
import { createServer } from 'http'
import { load } from 'js-yaml'
import { lookup } from 'mrmime'
import { watch } from 'chokidar'
import { marked, Renderer } from 'marked'
import { bold, bgRed, yellow, blue, green, red } from 'yoctocolors'
import { gfmHeadingId, reset } from 'marked-gfm-heading-id'
import { http, default_schemes as schemes } from '@hyrious/esbuild-plugin-http'

const read = promises.readFile
const write = promises.writeFile
const rm = promises.rm

function error_exit(...msg) {
  msg = msg.join(' ')
  console.error(bgRed(' Err '), msg)
  process.exit(1)
}

function get_runtime() {
  return readFileSync(new URL('./runtime.js', import.meta.url), 'utf8').replace(/\r?\n/g, ';')
}

function get_katex_css() {
  return 'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css'
}

function get_files(dir) {
  const files = []
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.isFile()) files.push(join(dir, d.name))
  }
  return files
}

function hash(contents) {
  return createHash('md5').update(contents).digest('hex')
}

function matter(text) {
  text = text.replace(/\r\n/g, '\n')
  if (!text.startsWith('---') || text[3] !== '\n') return [null, text]
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) return [null, text]
  const raw = text.slice(4, end)
  const content = text.slice(end + 5)
  return [load(raw), content]
}

class Post {
  constructor(id, title, date, text, html) {
    this.id = id
    this.title = title
    this.date = date
    this.text = text
    this.html = html

    date.toString = function () {
      return this.toISOString().slice(0, 10)
    }
  }
}

let has_math = false

marked.use(linkify())
marked.use(gfmHeadingId())
marked.use({
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  },
  extensions: [
    {
      name: 'math',
      level: 'inline',
      start(src) {
        return src.match(/\$\$[^\$]+?\$\$|\$[^\$]+?\$/)?.index
      },
      tokenizer(src, tokens) {
        const block = /^\$\$([^\$]+?)\$\$/.exec(src)
        if (block) {
          return { type: 'math', raw: block[0], text: block[1], tokens: [], display: true }
        }
        const inline = /^\$([^\$]+?)\$/.exec(src)
        if (inline) {
          return { type: 'math', raw: inline[0], text: inline[1], tokens: [], display: false }
        }
      },
      renderer(token) {
        has_math = true
        return katex.renderToString(token.text, { displayMode: token.display })
      },
    },
    {
      name: 'footnoteList',
      level: 'block',
      start(src) {
        return src.match(/^\[\^\d+\]:/)?.index
      },
      tokenizer(src, tokens) {
        const match = /^(?:\[\^(\d+)\]:[^\n]*(?:\n|$))+/.exec(src)
        if (match) {
          const token = { type: 'footnoteList', raw: match[0], text: match[0].trim(), tokens: [] }
          this.lexer.inline(token.text, token.tokens)
          return token
        }
      },
      renderer(token) {
        const fragment = this.parser.parseInline(token.tokens)
        return `<section class="footnotes"><ol dir="auto">${fragment}</ol></section>\n`
      },
    },
    {
      name: 'footnote',
      level: 'inline',
      start(src) {
        return src.match(/\[\^\d+\]/)?.index
      },
      tokenizer(src, tokens) {
        const list = /^\[\^(\d+)\]:([^\n]*)(?:\n|$)/.exec(src)
        if (list) {
          const tokens = this.lexer.inlineTokens(list[2].trim(), [])
          return { type: 'footnote', raw: list[0], id: parseInt(list[1]), tokens, def: true }
        }
        const inline = /^\[\^(\d+)\]/.exec(src)
        if (inline) {
          return { type: 'footnote', raw: inline[0], id: parseInt(inline[1]), tokens: [], def: false }
        }
      },
      renderer(token) {
        if (!token.def) {
          return `<sup><a href="#user-content-fn-${token.id}" data-footnote-ref="" id="user-content-fnref-${token.id}">${token.id}</a></sup>`
        }
        const fragment = this.parser.parseInline(token.tokens)
        return `<li id="user-content-fn-${token.id}"><p dir="auto">${fragment} <a href="#user-content-fnref-${token.id}" class="data-footnote-backref" aria-label="Back to content"><g-emoji class="g-emoji" alias="leftwards_arrow_with_hook" fallback-src="https://github.githubassets.com/images/icons/emoji/unicode/21a9.png">↩</g-emoji></a></p></li>`
      },
    },
  ],
  renderer: {
    code(code, lang) {
      if (lang === 'math') {
        has_math = true
        return `<p class="math">${katex.renderToString(code, { displayMode: true })}</p>`
      }
      return false
    },
    link(href, title, text) {
      let html = Renderer.prototype.link.call(this, href, title, text)
      if (href.startsWith('http')) {
        html = html.replace(/^<a /, '<a target="_blank" rel="noopener" ')
      }
      return html
    },
  },
})

function render_markdown(file) {
  const id = basename(file, '.md')
  const raw = readFileSync(file, 'utf8')
  const [data, text] = matter(raw)
  if (typeof data !== 'object' || data === null) error_exit('Missing frontmatter in', file)
  const { title, date, scripts } = data
  if (!title) error_exit("Missing 'title' in frontmatter of", file)
  reset()
  has_math = false
  let html = marked.parse(text).trimEnd()
  if (has_math) html = `<link rel="stylesheet" href="${get_katex_css()}">\n` + html
  if (scripts)
    if (Array.isArray(scripts) && typeof scripts[0] === 'string')
      for (const src of scripts)
        html += `\n<script ${src.endsWith('.mjs') ? 'type="module" ' : ''}src="${src}"></script>`
    else error_exit(`Invalid 'scripts' in frontmatter of ${file}, should be an array of strings`)
  return new Post(id, title, date, text, html)
}

class Token {
  constructor(head, tail, expr, raw) {
    this.head = head
    this.tail = tail
    this.expr = expr
    this.raw = raw
  }
}

function next_mustache_tag(str) {
  let i, j
  if ((i = str.indexOf('{')) >= 0) {
    if (str[i + 1] === '{') {
      if ((j = str.indexOf('}}', i + 2)) >= 0) {
        return new Token(str.slice(0, i), str.slice(j + 2), null, str.slice(i + 1, j + 1))
      }
    }
    if ((j = str.indexOf('}', i + 1)) >= 0) {
      return new Token(str.slice(0, i), str.slice(j + 1), str.slice(i + 1, j), null)
    }
  }
}

function s(str) {
  return JSON.stringify(str)
}

function expr(str) {
  if (str.startsWith('#if')) return `if (${str.slice(3).trim()}) {\n`
  if (str.startsWith('#else')) return '} else {\n'
  if (str.startsWith('#else if')) return `} else if (${str.slice(8).trim()}) {\n`
  if (str.startsWith('/if')) return '}\n'
  if (str.startsWith('#each')) {
    const [list, x] = str.slice(5).split(' as ')
    return `for (const ${x.trim()} of ${list.trim()}) {\n`
  }
  if (str.startsWith('/each')) return '}\n'
  if (str.startsWith('@')) return `const ${str.slice(1)}\n`
  return `html += ${str.trim()}\n`
}

function compile(file) {
  let str = readFileSync(file, 'utf8')
  let code = "let html = '';\n"
  while (true) {
    const tag = next_mustache_tag(str)
    if (tag) {
      code += `html += ${s(tag.head)};\n`
      if (tag.raw) code += `html += ${s(tag.raw)};\n`
      if (tag.expr) code += expr(tag.expr)
    } else {
      code += `html += ${s(str)};\n`
      break
    }
    str = tag.tail
  }
  code += 'return html;'
  const render = new Function('{ site, posts, post }', code)
  Object.defineProperty(render, 'name', { value: file })
  return render
}

const http_plugin = http({ schemes }) // cache here

function render_style(file, outdir) {
  const p = esbuild.build({
    entryPoints: [file],
    bundle: true,
    outdir,
    plugins: [http_plugin],
    legalComments: 'none',
  })
  return p.catch(() => process.exit(1))
}

async function build(root = '.') {
  const src = join(root, '_src')
  const dst = join(root, 'p')

  const tasks = [] // Promise[]
  const posts = []
  const renderer = {}
  const outputs = {} // touch me!

  const start = Date.now()

  for (const file of get_files(src)) {
    if (file.endsWith('.md')) {
      posts.push(render_markdown(file))
    }
    if (file.endsWith('.css')) {
      tasks.push(render_style(file, root))
      const outfile = join(root, basename(file))
      outputs[outfile] = false // do not have to write
      console.log(blue('  write'), outfile)
    }
    if (file.endsWith('.html')) {
      renderer[basename(file, '.html')] = compile(file)
    }
  }

  posts.sort((a, b) => +b.date - +a.date)
  const data = { site: { date: posts[0]?.date }, posts, post: null }

  const render_p = renderer.p
  delete renderer.p
  const render_post = renderer.post
  delete renderer.post
  for (const id in renderer) {
    outputs[join(root, id + '.html')] = renderer[id](data)
  }
  if (render_p) {
    outputs[join(dst, 'index.html')] = render_p(data)
  }
  if (render_post)
    for (const post of posts) {
      data.post = post
      outputs[join(dst, post.id + '.html')] = render_post(data)
    }

  const outdated = new Set(get_files(dst))
  for (const file in outputs)
    if (!outdated.has(file) && outputs[file]) {
      tasks.push(write(file, outputs[file]))
    }

  for (const file of outdated) {
    if (file in outputs) {
      if (outputs[file])
        tasks.push(
          read(file, 'utf8').then(old => {
            if (hash(old) !== hash(outputs[file])) {
              console.log(blue('  write'), file)
              return write(file, outputs[file])
            }
          }),
        )
    } else {
      console.log(yellow(' delete'), file)
      tasks.push(rm(file, { force: true }))
    }
  }

  await Promise.allSettled(tasks).then(results => {
    for (const { status, reason } of results) {
      if (status === 'rejected') {
        console.error(cleanStack(reason.stack))
      }
    }
  })

  console.log(green('   done'), `in ${Math.floor(Date.now() - start)}ms`)

  data.post = null

  return {
    env: outputs,
    data,
    renderer: { p: render_p, post: render_post, other: renderer },
  }
}

async function serve(root = '.') {
  const { env, data, renderer } = await build(root)

  const src = join(root, '_src')
  const dst = join(root, 'p')

  const clients = new Set()

  const watcher = watch(src, {
    ignoreInitial: true,
    ignorePermissionErrors: true,
  })

  const runtime = get_runtime()

  const server = createServer((req, res) => {
    let pathname = req.url || '/'
    let index, search
    if (~(index = pathname.indexOf('?', 1))) {
      search = decodeURIComponent(pathname.slice(index + 1))
      pathname = pathname.slice(0, index)
    }
    if (pathname.includes('%')) {
      try {
        pathname = decodeURIComponent(pathname)
      } catch {}
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Range')

    if (pathname === '/@tg/events') {
      clients.add(res)
      res.once('close', () => clients.delete(res))
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write(': connected\n\n')
      return
    }

    let file = join(root, pathname.slice(1) || 'index.html')
    if (file.endsWith('/')) file += '.html'
    else if (!(file in env) && file + '.html' in env) file += '.html'
    else if (file + '/index.html' in env) {
      res.writeHead(302, { Location: pathname + '/' })
      return res.end()
    }

    if (file in env) {
      let raw = env[file] || readFileSync(file, 'utf8')
      if (raw.includes('<head>')) {
        raw = raw.replace('<head>', `$&<script type=module>${runtime}</script>`)
      }
      res.writeHead(200, {
        'Content-Type': lookup(file) || 'text/plain',
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(raw),
      })
      return res.end(raw)
    }

    res.statusCode = 404
    res.end()
  })

  const invalidate_post = path => {
    const post = render_markdown(path)
    data.post = post
    const index = data.posts.findIndex(p => p.id === post.id)
    if (index !== -1) {
      data.posts[index] = post
    } else {
      data.posts.push(post)
    }
    data.posts.sort((a, b) => +b.date - +a.date)
    if (renderer.post) {
      const file = join(dst, post.id + '.html')
      env[file] = renderer.post(data)
      const updated = [file, file.slice(0, -5)]
      const payload = { styles: [], updated, html: env[file] }
      for (const res of clients) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      }
    }
  }

  const invalidate_p = () => {
    data.post = null
    if (renderer.p) {
      const file = join(dst, 'index.html')
      env[file] = renderer.p(data)
      const updated = [file, dst + '/']
      const payload = { styles: [], updated, html: env[file] }
      for (const res of clients) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      }
    }
  }

  const invalidate_other = () => {
    data.post = null
    for (const id in renderer.other) {
      const file = join(root, id + '.html')
      env[file] = renderer.other[id](data)
      const updated = [file, file.slice(0, -5)]
      if (id === 'index') updated.push('')
      const payload = { styles: [], updated, html: env[file] }
      for (const res of clients) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      }
    }
  }

  watcher.on('all', async (ev, path) => {
    if (path.endsWith('.css')) {
      await render_style(path, root)
      const href = '/' + join(root, basename(path))
      const payload = { styles: [href], updated: [], html: '' }
      for (const res of clients) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      }
    }

    if (path.endsWith('.md')) {
      invalidate_post(path)
      invalidate_p()
      invalidate_other()
    }

    if (path.endsWith('.html')) {
      const id = basename(path, '.html')
      if (id === 'p' || id === 'post') {
        renderer[id] = compile(path)
        if (id === 'p') {
          invalidate_p()
        } else {
          for (const file in env) {
            if (file.endsWith('.md')) invalidate_post(file)
          }
        }
      } else {
        renderer.other[id] = compile(path)
        invalidate_other()
      }
    }
  })

  server.listen(5000, () => {
    console.log(blue(' listen'), 'http://localhost:5000')
  })

  server.on('request', (req, res) => {
    const start = process.hrtime()
    req.once('end', () => {
      const dur = process.hrtime(start)
      const statusColor = res.statusCode < 300 ? green : res.statusCode < 400 ? yellow : red
      console.log(
        statusColor(res.statusCode),
        bold(`${(dur[1] / 1e6).toFixed(2)}ms`),
        `${req.method} ${req.url || '/'}`,
      )
    })
  })

  return server
}

export { build, serve }
