## Blot

Markdown is not a strict language, it is not suitable for
[live-editing](./live-editing.md) and for implementing a rich text editor.
So I take the idea from quill.js' [parchment](https://github.com/quilljs/parchment)
and represent the whole doc as a sequence/tree of **blots**.

A blot is maybe a plain string, an `<hr>`, or a formatted string `<bold>`,
or a block `<p>`, or anything else that can construct a document. One strict
rule is that inline blots must be put inside block blots
