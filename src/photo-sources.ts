/** Only documented source-CDN resize paths. Never guess Magento cache hashes. */
export function responsivePhoto(source: string): {srcSet?: string} {
  if (/^https:\/\/cdn11\.bigcommerce\.com\/[^/]+\/images\/stencil\/1024w\//.test(source)) {
    return {srcSet:[320,640,1024].map(width=>`${source.replace('/1024w/',`/${width}w/`)} ${width}w`).join(', ')}
  }
  return {}
}
