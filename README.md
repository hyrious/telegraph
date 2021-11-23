## @hyrious/telegraph

Standalone node app to write blog post.

**!!!Early Phase:** This package is still in development and is mainly used by myself.\
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
built dist/index.html       123 B
built dist/post-title.html 4.56 kB

# start a simple http server at dist folder
$ tg preview
serving http://localhost:5000
```

### Config

Create a `_config.yml` to some folder, or let the cli help you.

```bash
$ tg init
created _config.yml.
```

See [_config.yml](src/_config.yml) for more details.

### Supported Markups

Plain text (.txt), Markdown (.md, .markdown).

## License

MIT @ [hyrious](https://github.com/hyrious)
