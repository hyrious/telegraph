import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'

import { build } from './build.js'

export function watch(root) {
  let last_styles = {}
  let last_htmls = {}
  fs.readdirSync(root).forEach((file) => {
    let p = path.join(root, file)
    if (file.endsWith('.css')) last_styles[p] = fs.readFileSync(p, 'utf8')
    if (file.endsWith('.html')) last_htmls[p] = fs.readFileSync(p, 'utf8')
  })
  fs.readdirSync(path.join(root, 'p')).forEach((file) => {
    let p = path.join(root, 'p', file)
    if (file.endsWith('.html')) last_htmls[p] = fs.readFileSync(p, 'utf8')
  })

  let time = 0
  let will_delete
  let watch_context = {
    begin() {
      time = Date.now()
    },
    output(p, text) {
      will_delete.delete(p)
      if (last_htmls[p] !== text) {
        fs.writeFileSync(p, text)
        console.log('updated', p)
        last_htmls[p] = text
      }
    },
    style_updated(p) {
      const text = fs.readFileSync(p, 'utf8')
      if (last_styles[p] !== text) {
        console.log('updated', p)
        last_styles[p] = text
      }
    },
    should_clean(p) {
      will_delete = new Set(fs.readdirSync(p).map((p) => path.join(root, 'p', p)))
    },
    end() {
      will_delete.forEach((p) => {
        fs.rmSync(p, { force: true })
        console.log('deleted', p)
      })
      console.log('refreshed in', Date.now() - time, 'ms')
    },
  }
  let watcher = chokidar.watch(path.join(root, '_src'), {
    ignored: ['**/node_modules/**', '**/.git/**'],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    disableGlobbing: true,
  })
  watcher.on('change', function rebuild() {
    build(root, watch_context)
  })
  build(root, watch_context)
}
