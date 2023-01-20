#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

import sade from 'sade'
import { slug } from 'github-slugger'
import { apStyleTitleCase } from 'ap-style-title-case'

import { build, serve } from './lib/telegraph.js'

sade('tg')
  .version(JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url))).version)
  .describe('Yet another static site generator')

  .command('build [root]', 'Build the site, expects a _src folder in the root folder.', { default: true })
  .option('-w, --watch', 'Watch for changes and rebuild automatically', false)
  .example('build -w')
  .action(function (root, options) {
    const action = options.watch ? serve : build
    action(root)
  })

  .command('new <title> [root]')
  .describe('Create a new _src/<title>.md.')
  .example('new "Hello, world"')
  .action(function (title, root = '.') {
    fs.mkdirSync(path.join(root, '_src'), { recursive: true })
    const text = `---
title: ${apStyleTitleCase(title)}
date: ${new Date().toISOString().slice(0, 10)}
---

Lorem ipsum solo sit amet.
`
    const p = path.join(root, '_src', slug(title).replace(/^-+|-+$/g, '') + '.md')
    if (fs.existsSync(p)) {
      console.error('already exists', p)
      process.exit(1)
    }
    fs.writeFileSync(p, text)
    console.log('written', p)
  })

  .parse(process.argv)
