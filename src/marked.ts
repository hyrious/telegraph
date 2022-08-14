import Slugger from "github-slugger";
import hljs from "highlight.js";
import Katex from "katex";
import { marked } from "marked";
import { createRequire } from "module";

const require = /* @__PURE__ */ createRequire(import.meta.url);
const full = /* @__PURE__ */ require("markdown-it-emoji/lib/data/full.json");

let slugger = /* @__PURE__ */ new Slugger();

let renderer: marked.RendererObject = {
  heading(this: marked.Renderer, text, level, raw) {
    if (this.options.headerIds) {
      const id = (this.options.headerPrefix || "") + slugger.slug(raw);
      return `<h${level} id="${id}">${text}</h${level}>\n`;
    }
    return false;
  },
  code(code, lang) {
    if (lang === "math") {
      return `<p>${Katex.renderToString(code, { displayMode: true })}</p>`;
    }
    return false;
  },
};

type Extension = marked.RendererExtension | marked.TokenizerExtension;

let math: Extension = {
  name: "math",
  level: "inline",
  start(src) {
    return src.match(/\$\$[^\$]+?\$\$|\$[^\$]+?\$/)?.index ?? -1;
  },
  tokenizer(src, tokens) {
    const matchBlock = /^\$\$([^\$]+?)\$\$/.exec(src);
    if (matchBlock) {
      const token = {
        type: "math",
        raw: matchBlock[0],
        text: matchBlock[1],
        tokens: [],
        display: true,
      };
      return token;
    }
    const matchInline = /^\$([^\$]+?)\$/.exec(src);
    if (matchInline) {
      const token = {
        type: "math",
        raw: matchInline[0],
        text: matchInline[1],
        tokens: [],
        display: false,
      };
      return token;
    }
  },
  renderer(token) {
    return Katex.renderToString(token.text, { displayMode: token.display });
  },
};

let footnoteList: Extension = {
  name: "footnoteList",
  level: "block",
  start(src) {
    return src.match(/^\[\^\d+\]:/)?.index ?? -1;
  },
  tokenizer(src, tokens) {
    const match = /^(?:\[\^(\d+)\]:[^\n]*(?:\n|$))+/.exec(src);
    if (match) {
      const token = {
        type: "footnoteList",
        raw: match[0],
        text: match[0].trim(),
        tokens: [],
      };
      this.lexer.inline(token.text, token.tokens);
      return token;
    }
  },
  renderer(token) {
    const fragment = (this.parser as any).parseInline(token.tokens);
    return `<section class="footnotes"><ol dir="auto">${fragment}</ol></section>\n`;
  },
};

let footnote: Extension = {
  name: "footnote",
  level: "inline",
  start(src) {
    return src.match(/\[\^\d+\]/)?.index ?? -1;
  },
  tokenizer(src, tokens) {
    const matchList = /^\[\^(\d+)\]:([^\n]*)(?:\n|$)/.exec(src);
    if (matchList) {
      return {
        type: "footnote",
        raw: matchList[0],
        id: parseInt(matchList[1]),
        tokens: this.lexer.inlineTokens(matchList[2].trim(), []),
        def: true,
      };
    }
    const matchInline = /^\[\^(\d+)\]/.exec(src);
    if (matchInline) {
      return {
        type: "footnote",
        raw: matchInline[0],
        id: parseInt(matchInline[1]),
        tokens: [],
        def: false,
      };
    }
  },
  renderer(token) {
    if (!token.def) {
      return `<sup><a href="#user-content-fn-${token.id}" data-footnote-ref="" id="user-content-fnref-${token.id}">${token.id}</a></sup>`;
    }
    const fragment = (this.parser as any).parseInline(token.tokens);
    return `<li id="user-content-fn-${token.id}"><p dir="auto">${fragment} <a href="#user-content-fnref-${token.id}" class="data-footnote-backref" aria-label="Back to content"><g-emoji class="g-emoji" alias="leftwards_arrow_with_hook" fallback-src="https://github.githubassets.com/images/icons/emoji/unicode/21a9.png">↩</g-emoji></a></p></li>`;
  },
};

let emoji: Extension = {
  name: "emoji",
  level: "inline",
  start(src) {
    return src.match(/:[a-zA-Z0-9_\-\+]+:/)?.index ?? -1;
  },
  tokenizer(src, tokens) {
    const match = /^:([a-zA-Z0-9_\-\+]+):/.exec(src);
    if (match && match[1] in full) {
      return {
        type: "emoji",
        raw: match[0],
        text: (full as any)[match[1]],
      };
    }
  },
  renderer(token) {
    const codePoint = token.text.codePointAt(0).toString(16);
    return `<g-emoji class="g-emoji" alias="${token.text}" fallback-src="https://github.githubassets.com/images/icons/emoji/unicode/${codePoint}.png">${token.text}</g-emoji>`;
  },
};

export const parse = /* @__PURE__ */ (function initMarked() {
  marked.use({
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
    extensions: [footnoteList, footnote, emoji, math],
    renderer,
  });
  return function parse(...args: Parameters<typeof marked["parse"]>) {
    slugger.reset();
    return marked.parse(...args);
  };
})();
