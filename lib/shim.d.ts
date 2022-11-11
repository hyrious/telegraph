declare module 'marked-linkify-it' {
  import { marked } from 'marked'
  const ext: marked.TokenizerExtension
  export default ext
}

declare module 'marked-gfm-heading-id' {
  import { marked } from 'marked'
  const gfmHeadingId: marked.RendererExtension
  const reset: { (): void }
  export { gfmHeadingId, reset }
}
