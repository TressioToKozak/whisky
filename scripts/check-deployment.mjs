// A successful Pages job is insufficient: legacy Pages can serve raw TSX.
import assert from 'node:assert/strict'
const base = process.argv[2]
assert.ok(base?.startsWith('https://'), 'Provide the HTTPS deployment URL')
async function verify() {
  const response = await fetch(base, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
  assert.equal(response.status, 200, 'The deployed page must respond with HTTP 200')
  const html = await response.text()
  assert.match(html, /Dram — Twój świat whisky/, 'The deployment must contain Dram')
  assert.doesNotMatch(html, /(?:src|href)=["'][^"']*\/(?:src\/|@vite\/)/, 'Pages is serving source files instead of the production build')
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m => m[1])
  assert.ok(scripts.length, 'No JavaScript bundle found')
  for (const path of scripts) {
    assert.match(path, /\/whisky\/assets\/[^/]+\.js$/, 'Expected a compiled Vite bundle under /whisky/assets/')
    const bundle = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) })
    assert.equal(bundle.status, 200, 'The public JavaScript bundle is unavailable')
    assert.match(bundle.headers.get('content-type') ?? '', /javascript/, 'The bundle has an incorrect MIME type')
    assert.ok((await bundle.text()).length > 10000, 'The application bundle is unexpectedly small')
  }
  for (const m of html.matchAll(/href=["']([^"']+\.css)["']/g)) {
    const css = await fetch(new URL(m[1], base), { signal: AbortSignal.timeout(20000) })
    assert.equal(css.status, 200, 'The public stylesheet is unavailable')
    assert.match(css.headers.get('content-type') ?? '', /text\/css/)
  }
  console.log('Public HTML, compiled JavaScript and stylesheet verified:', base)
}
let failure
for (let attempt = 0; attempt < 12; attempt++) {
  try { await verify(); process.exit(0) }
  catch (error) { failure = error; console.error(`Deployment check ${attempt+1}/12: ${error.message}`); if (attempt < 11) await new Promise(resolve => setTimeout(resolve,5000)) }
}
throw failure
