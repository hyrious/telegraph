# @hyrious/telegraph

> Opinionated blogging workflow by [@hyrious](https://github.com/hyrious).

## Get Started

This tool does not work out of the box.
Take a look at [my blog's \_src folder](https://github.com/hyrious/hyrious.github.io/blob/main/_src) to continue.

## Commands

- `tg build [--watch] [root]`: Build the site, expects a `_src` folder in `[root]`.
- `tg new <title> [root]`: Create a new post `_src/title.md`.

### Tip: use with [w7](https://github.com/hyrious/w7)

```bash
$ npm i -g concurrently @hyrious/w7 @hyrious/telegraph
$ conc w7 "tg build -w"
```

## Rules

The folder `_src` and `p` are hard-coded, not changeable.

`_src/*.css` &rarr; `*.css`\
`_src/p.html`, `_src/*.md` &rarr; `p/index.html`\
`_src/*.html`, `_src/*.md` &rarr; `*.html`\
`_src/*.md` &rarr; `p/*.html`

### Front-matter

`_src/*.md` **must** have the two attributes in its front-matter:

```yaml
title: Hello, world!
date: 2022-01-21
```

An optional attribute, `scripts`, can be used to import js files:

```yaml
scripts:
  - ../script.mjs
```

yields &darr;

```html
<script type="module" src="../script.mjs"></script>
```

### Assets

`_src/*.css` can import `https://...css` assets, they will be fetched during
build and be included in the final bundle.

### Template

`_src/*.html` are templates, they can use a simple template language:

```svelte
<ul>
  {#each posts as post}
  <li><a href="p/{ post.id }">{ post.title }</a></li>
  {/each}
</ul>
```

Available variables:

```ts
var site: { date: string }
var posts: Post[]
var post: Post | null // only exist in _src/post.html
interface Post {
  id: string
  title: string
  date: string
  text: string
  html: string
}
```

## Develop

```console
npm install && npm link
tg path/to/blog
npm r -g @hyrious/telegraph
```

## Changelog

## License

MIT @ [hyrious](https://github.com/hyrious)
