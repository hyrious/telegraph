# @hyrious/telegraph

Standalone node app to write blog post.

**!!!Early Phase:** This package is still in development and is mainly used by
myself.\
But PRs and issues are welcome.

## Install & Use

```bash
$ npm i -g @hyrious/telegraph
$ tg
serving http://localhost:3000
# then open the browser and navigate to http://localhost:3000
```

If you don't like working in the browser, you can use the CLI:

```bash
$ tg new "post-title"
created post-title.md
```

Other commands:

```bash
# build the site
$ tg build
  .tg/dist/index.html        123 b
  .tg/dist/post-title.html  4.56 kb
Done in 789ms.

# start a simple http server at dist folder
$ tg preview
serving http://localhost:5000
```

### Config

Create a `.tg/config.ts`, or let the cli help you. You can use JSON or YAML too.

```bash
$ tg init
created .tg/config.ts.
created index.md
```

See [<samp>config.ts</samp>](src/config.ts) for more details.

### Front Matter

Any file can have a YAML front matter block at the beginning like this:

```yaml
---
layout: post # use _layout/post.html
title: Hello, world! # will be placed in <title>
date: 2021-12-25 # will generate a <time> tag after the first heading element
---
Hi there! This is a post.
```

It will be processed with [gray-matter](https://github.com/jonschlinkert/gray-matter).

You can access these variables in your content with the special variable `page`:

```yaml
---
title: Hello, world!
---

# {{ page.title }}
```

### Liquid Template

Provided by [LiquidJS](https://liquidjs.com). To be mentioned here is
the rendering order of each page:

1. Evaluate liquid expressions.
2. Convert it to HTML.
3. Apply layouts (recursively).

The full site's rendering order is:

1. Read all configs, posts, assets.
2. Render each page in the order of above.
3. Write the site to the output folder.

### Directory Structure

A blog usually looks something like this:

```
.
|- index.html
|- post-title.md
|- .tg/
    |- config.ts
    |- dist/        # output folder
```

All files will be rendered to html/css/js and saved to `.tg/dist` folder, except
the ones with `.`, `_`, `#`, `~` prefix.

### Live Editing

The built-in server started by `tg` is a simplified centralized live editor.
**Live** means that 2 or more people can edit the same file at the same time.

For more details on how it works, see [Live Editing](./docs/live-editing.md).

## License

MIT @ [hyrious](https://github.com/hyrious)
