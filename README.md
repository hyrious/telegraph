## @hyrious/telegraph

> Opinionated blogging workflow by [@hyrious](https://github.com/hyrious).

## Folder Structure

```
github:username.github.io/
    _src/
        post-title.md       # post source
        style.css           # css source
        index.html          # template for homepage
        post.html           # template for each post
        post-index.html     # template for post/index.html
    p/
        index.html          # [generated] all posts list
        post-title.html     # [generated] from
                              _src/post-title.md and _src/post.html
    favicon.ico             # user favicon
    index.html              # [generated] from _src/index.html
    style.css               # [generated] from _src/style.css
    CNAME                   # user CNAME
    .nojekyll               # tell github to not process it to jekyll
```

Strip <q>generated</q>, these must be hand-written by user:

```
github:username.github.io/
    _src/
        post-title.md
        style.css
        index.html
        post.html
        post-index.html
    favicon.ico
    CNAME
    .nojekyll
```

## Process

This tool works in these steps:

```
@parallel build _src/style.css to ./style.css

posts = []
foreach _src/*.md, collect post info {
    posts << { id (slug-name), title, date, text }
}
posts.sortBy! date

@parallel build _src/index.html to ./index.html with posts info

@parallel build _src/post-index.html to p/index.html with posts info

foreach post in posts {
    @parallel build _src/post.md + _src/post.html to p/post.html
}
```

Dependency graph:

```
./style.css: _src/style.css
./index.html: _src/index.html _src/*.md
./p/index.html: _src/post-index.html _src/*.md
./p/title.html: _src/post.html _src/title.md
```

No JS, but will support KaTeX natively.

## License

MIT @ [hyrious](https://github.com/hyrious)
