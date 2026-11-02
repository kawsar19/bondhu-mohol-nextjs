// Developer tool: finds a freely licensed photo on Wikimedia Commons for every item in
// data/ingredient-catalog.json and saves a small copy to public/catalog/<key>.jpg|png,
// with author and licence in data/ingredient-catalog-credits.json (shown on /credits).
// Usage: node scripts/fetch-catalog-images.mjs [--force] [key ...]
// A wrong pick is fixed by putting the exact Commons file in data/ingredient-catalog-overrides.json,
// e.g. { "okra": "File:Okra.jpg" }, then running this again for that key.
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'RestaurantPOS-catalog/1.0 (ingredient photos; contact: design.qtecsl@gmail.com)'
const OUT = 'public/catalog'
const CREDITS = 'data/ingredient-catalog-credits.json'
const OVERRIDES = 'data/ingredient-catalog-overrides.json'
// Commercial use allowed. SA-licensed photos are used as they are (Commons' own thumbnail), with credit.
const LICENSE_OK = /^(CC0|Public domain|PD\b|CC BY(-SA)? \d)/i
// Titles that usually mean a cooked dish, a drawing or something else that isn't the raw item.
const AVOID = /(curry|soup|recipe|cooked|dish|plate|meal|map|logo|diagram|drawing|illustration|icon|label|stamp|coat of arms|flag|svg|chart|museum|statue|painting|köhler|kohler|medizinal|pflanzen|plant|flower|blossom|tree|field|botanical|herbarium|poster)/i

const catalog = JSON.parse(readFileSync('data/ingredient-catalog.json', 'utf8'))
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {}
const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {}
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = new Set(args.filter(a => !a.startsWith('--')))
mkdirSync(OUT, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))
const strip = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

async function get(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return res.json()
    await sleep(1500 * (attempt + 1))
  }
  throw new Error(`Commons API failed for ${params.gsrsearch ?? params.titles}`)
}

const INFO = { prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '240', iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl' }

function candidates(data) {
  return Object.values(data?.query?.pages ?? {}).map(p => {
    const info = p.imageinfo?.[0]
    const meta = info?.extmetadata ?? {}
    return info && { title: p.title, index: p.index ?? 0, mime: info.mime, width: info.width, height: info.height, thumb: info.thumburl, page: info.descriptionurl, license: strip(meta.LicenseShortName?.value), licenseUrl: strip(meta.LicenseUrl?.value), artist: strip(meta.Artist?.value) || 'Unknown' }
  }).filter(Boolean)
}

function score(c, query) {
  if (!['image/jpeg', 'image/png'].includes(c.mime) || !LICENSE_OK.test(c.license) || !c.thumb) return -1
  const title = c.title.toLowerCase()
  if (AVOID.test(title)) return -1
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const hits = words.filter(w => title.includes(w.replace(/s$/, ''))).length
  const ratio = c.width / c.height
  // Search rank still matters most; then words from the query in the title; then a photo that isn't a long strip.
  return 10 - c.index + hits * 4 + (c.mime === 'image/jpeg' ? 2 : 0) + (ratio > 0.6 && ratio < 1.8 ? 2 : 0)
}

// The lead photo of the item's Wikipedia article: chosen by editors, so usually the raw item itself.
async function wikiLead(title) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: title })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const page = Object.values((await res.json())?.query?.pages ?? {})[0]
  return page?.pageimage ? `File:${page.pageimage}` : null
}

async function pick(item) {
  if (overrides[item.key]) return candidates(await get({ action: 'query', titles: overrides[item.key], ...INFO })).find(c => LICENSE_OK.test(c.license))
  // Non-free article images aren't on Commons, so they drop out here and the search below is used instead.
  const lead = item.wiki && !args.includes('--search-only') ? await wikiLead(item.wiki) : null
  if (lead) {
    const c = candidates(await get({ action: 'query', titles: lead, ...INFO }))[0]
    if (c && ['image/jpeg', 'image/png'].includes(c.mime) && LICENSE_OK.test(c.license) && c.thumb) return c
  }
  const found = candidates(await get({ action: 'query', generator: 'search', gsrnamespace: '6', gsrlimit: '12', gsrsearch: `${item.query} filetype:bitmap`, ...INFO }))
  return found.map(c => ({ c, s: score(c, item.query) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s)[0]?.c
}

const todo = catalog.items.filter(i => (only.size ? only.has(i.key) : true) && (force || only.size || !credits[i.key]))
console.log(`Looking up ${todo.length} of ${catalog.items.length} items…`)
let saved = 0
const missing = []
for (const item of todo) {
  try {
    const c = await pick(item)
    if (!c) { missing.push(item.key); delete credits[item.key]; continue }
    const res = await fetch(c.thumb, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`download ${res.status}`)
    const ext = c.mime === 'image/png' ? 'png' : 'jpg'
    for (const old of ['jpg', 'png']) if (old !== ext && existsSync(`${OUT}/${item.key}.${old}`)) unlinkSync(`${OUT}/${item.key}.${old}`)
    writeFileSync(`${OUT}/${item.key}.${ext}`, Buffer.from(await res.arrayBuffer()))
    credits[item.key] = { file: c.title, artist: c.artist, license: c.license, licenseUrl: c.licenseUrl, source: c.page, image: `/catalog/${item.key}.${ext}` }
    saved++
    process.stdout.write('.')
  } catch (err) {
    missing.push(item.key)
    console.log(`\n${item.key}: ${err.message}`)
  }
  await sleep(250)
}
writeFileSync(CREDITS, JSON.stringify(Object.fromEntries(Object.entries(credits).sort()), null, 1) + '\n')
console.log(`\nSaved ${saved}. No suitable photo: ${missing.length}${missing.length ? ` (${missing.join(', ')})` : ''}`)
