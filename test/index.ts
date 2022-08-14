import { renderMarkdown } from "../src";

const html = renderMarkdown(`
## Hello, $ E=mc^2 $

> Hello, world![^1]

[^1]: This is a footnote.
`);

console.log(html);
