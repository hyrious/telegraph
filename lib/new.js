import fs from 'node:fs'
import path from 'node:path'
import { slug } from 'github-slugger'
import { apStyleTitleCase } from 'ap-style-title-case'

export function create(title, root) {
  root = path.resolve(root || '.')
  fs.mkdirSync(path.join(root, '_src'), { recursive: true })
  let text = `---
title: ${apStyleTitleCase(title)}
date: ${new Date().toISOString().slice(0, 10)}
---

Lorem ipsum solo sit amet.
`
  let p = path.join(root, '_src', slug(title).replace(/^-+|-+$/g, '') + '.md')
  if (fs.existsSync(p)) {
    console.error('already exists', p)
    process.exit(1)
  }
  fs.writeFileSync(p, text)
  console.log('written', p)
}
