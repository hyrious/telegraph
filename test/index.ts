import { parseMarkdown } from "../src";

const html = parseMarkdown(
  "hello-world.md",
  `---
title: Hello, world!
date: 2022-08-15
---

## Hello, $ E=mc^2 $

> Hello, world![^1]

[^1]: This is a footnote.
`
);

console.log(html);
