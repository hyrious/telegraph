# @hyrious/telegraph

> Opinionated blogging workflow by [@hyrious](https://github.com/hyrious).

## Opinions

- All source files are put in the `_src` folder, all posts are markdown in it.
  - `/p/{id}.html` will always **mirror** the content of `_src/{id}.md`.
- How it works:
  - `_src/{id}.html` will be compiled to `/{id}.html`.
  - `_src/p.html` will be compiled to `/p/index.html`.
  - `_src/post.html` and `_src/{id}.md` will be compiled to `/p/{id}.html`.
    - Markdown files must have front matter with contents of `{ date, title }`.
  - `_src/{id}.css` will be compiled to `/{id}.css`.
- Compilers:
  - Markdown: marked.js with a few extensions.
  - CSS: esbuild with http-plugin to bundle resources.
- Extensibility (**new!**):
  - Refer to any file outside of `_src` in posts, path just be fine when it starts with `../`.
  - Custom scripts: create `custom/script-name.js` and add `scripts: string[]` in frontmatter to include it, example:
    ```yaml
    scripts:
      - ../custom/script-name.js
    ```
    It will generate `<script src="../custom/script-name.js"></script>` in the final HTML.
    We use this way to avoid github rendering script tags in the markdown preview.

## Develop

```console
npm install && npm link
tg path/to/blog
npm r -g @hyrious/telegraph
```

## License

MIT @ [hyrious](https://github.com/hyrious)
