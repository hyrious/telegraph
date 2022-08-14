export interface BuildOptions {
  /** default: process.cwd() */
  cwd?: string;
  /** default: false */
  watch?: boolean;
}

export interface Post {
  id: string; // _src/{id}.md
  title: string; // extracted from frontmatter
  date: Date; // extracted from frontmatter
  text: string; // raw markdown
  html: string; // rendered html
}
