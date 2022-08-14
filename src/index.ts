import { load } from "js-yaml";
import { parse } from "./marked";
import { Post } from "./typings";

export * from "./typings";
export * from "./template";

function matter(text: string): [unknown, string] {
  if (!text.startsWith("---")) return [null, text];
  if (text[3] === "-") return [null, text];
  const end = text.indexOf("\n---\n", 3);
  if (end === -1) return [null, text];
  const frontMatter = text.slice(4, end);
  const content = text.slice(end + 5);
  return [load(frontMatter), content];
}

/** @internal */
class _Post implements Post {
  declare id: string;
  declare title: string;
  declare date: Date;
  declare text: string;
  declare html: string;
  constructor(id: string, title: string, date: Date, text: string, html: string) {
    this.id = id;
    this.title = title;
    this.date = date;
    this.text = text;
    this.html = html;
  }
}

export function parseMarkdown(id: string, raw: string): Post {
  const [frontmatter, text] = matter(raw);

  if (typeof frontmatter === "object" && frontmatter !== null) {
    const { title, date } = frontmatter as Record<string, any>;
    if (!title) {
      throw new Error(`Missing 'title' in frontmatter of ${id}.md`);
    }
    if (!date || !(date instanceof Date)) {
      throw new Error(`Missing 'date' in frontmatter of ${id}.md`);
    }

    return new _Post(id, title, date, text, parse(text));
  }

  throw new Error(`Missing frontmatter in ${id}.md`);
}
