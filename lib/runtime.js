const parser = new DOMParser()

new EventSource('/@tg/events').onmessage = function ({ data }) {
  const { styles, updated, html } = JSON.parse(data)

  if (updated.includes(location.pathname.slice(1))) {
    const doc = parser.parseFromString(html, 'text/html')
    document.body.replaceWith(doc.body)
    console.debug('[hmr] html updated')
  }

  if (styles.length) {
    let handled = false
    for (const link of document.getElementsByTagName('link')) {
      const url = new URL(link.href)
      if (url.host === location.host && url.pathname === styles[0]) {
        const next = link.cloneNode()
        next.href = styles[0] + '?' + Math.random().toString(36).slice(2)
        next.onload = () => link.remove()
        link.parentNode.insertBefore(next, link.nextSibling)
        handled = true
        break
      }
    }
    if (!handled) {
      const next = document.createElement('link')
      next.href = styles[0]
      document.head.appendChild(next)
    }
    console.debug('[hmr] style updated')
  }
}
