import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Layers', exact: true }).click()
await page.getByRole('textbox', { name: 'Search assets' }).waitFor()
await page.waitForTimeout(400)
if (await page.locator('.ws-sidebar').evaluate(element => element.getBoundingClientRect().right <= 0)) errors.push('Sidebar did not open')
await page.screenshot({ path: '../docs/geospatial/local-browser-mobile-layers.png' })
await page.getByRole('button', { name: 'Close sidebar' }).click()
await page.getByRole('button', { name: 'Environment', exact: true }).click()
await page.getByRole('button', { name: /Stockholm/ }).click()
await page.locator('.ws-weather-title').waitFor()
await page.waitForTimeout(400)
await page.screenshot({ path: '../docs/geospatial/local-browser-mobile-weather.png' })
await page.getByRole('button', { name: 'Close inspector' }).click()
await page.getByRole('button', { name: 'Close sidebar' }).click()
await page.getByRole('button', { name: /Terrain/ }).click()
await page.waitForTimeout(1200)
await page.screenshot({ path: '../docs/geospatial/local-browser-mobile-map.png' })

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
if (overflow) errors.push('Horizontal viewport overflow')
console.log(JSON.stringify({ viewport: '390x844', errors }))
await browser.close()
if (errors.length) process.exitCode = 1
