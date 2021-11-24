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
created src/post-title.md
```

Other commands:

```bash
# build the site
$ tg build
  dist/index.html        123 b
  dist/post-title.html  4.56 kb
Done in 789ms.

# start a simple http server at dist folder
$ tg preview
serving http://localhost:5000
```

### Config

Create a `_config.yml` to some folder, or let the cli help you.

```bash
$ tg init
created _config.yml.
created src/hello-world.md
```

See [<samp>\_config.yml</samp>](src/_config.yml) for more details.

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

In case it is possible that there's no correct syntax highlighter for the file,
you can write the yaml in a code block, or in a comment block, as long as
they are the first element of this file.

If the file does not have a front matter, tg will try to guess the title from
the first heading (`h1` ~ `h6`) element of the file content. The date will be
the file's last modification time (but it is incorrect at the most of the time,
so you'd better put one).

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
|- _config.yml
|- _layouts
  |- default.html
  |- post.html
|- index.html
|- post-title.md
```

All files will be rendered to html/css/js and saved to `{dist}` folder, except
the ones with `.`, `_`, `#`, `~` prefix. And there are some special files:

```
_config.yml # config file
_layouts/   # layout files, will choose `default.html` for all posts
            # without defining their layout in front matter
```

If there's no `_layouts/default.html`, it will fallback to a built-in one
which looks like [Telegraph](https://telegra.ph).

## License

MIT @ [hyrious](https://github.com/hyrious)
