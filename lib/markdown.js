import hljs from 'highlight.js'
import katex from 'katex'
import linkify from 'marked-linkify-it'
import { gfmHeadingId, reset } from 'marked-gfm-heading-id'
import { marked, Renderer } from 'marked'

let has_math = false

/** @type {marked.RendererObject} */
let renderer = {
  heading: gfmHeadingId().renderer.heading,
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
}

/** @typedef {marked.RendererExtension | marked.TokenizerExtension} Extension */

/** @type {Extension} */
let math = {
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
}

/** @type {Extension[]} */
let footnote = [
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
]

marked.use(linkify())

marked.use({
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  },
  extensions: [...footnote, math],
  renderer,
})

function reset_all() {
  reset()
  has_math = false
}

function include_katex() {
  return has_math
}

export { reset_all as reset, include_katex }
export default marked
