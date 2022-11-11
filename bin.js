#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import sade from 'sade'
import { build } from './lib/build.js'
import { watch } from './lib/watch.js'
import { create } from './lib/new.js'

const { version } = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))

const tg = sade('tg').version(version).describe('Yet another static site generator')

tg.command('build [root]', 'Build the site, expects a _src folder in the root folder.', { default: true })
  .option('-w, --watch', 'Watch for changes and rebuild automatically', false)
  .example('build -w')
  .action(main_)

tg.command('new <title> [root]')
  .describe('Create a new _src/<title>.md.')
  .example('new "Hello, world\\!"')
  .action(create_)

tg.parse(process.argv)

function create_(title, root) {
  root = path.resolve(root || '.')
  create(title, root)
}

function main_(root, options) {
  root = path.resolve(root || '.')
  main(root, options).catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
}

async function main(root, options) {
  if (options.watch) {
    await watch(root)
  } else {
    await build(root)
  }
}
