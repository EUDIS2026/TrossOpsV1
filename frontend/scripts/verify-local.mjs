import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.getByText('Survey aircraft 01').first().waitFor()
await page.screenshot({ path: '../docs/geospatial/local-browser.png', fullPage: true })
const before = await page.locator('.service-card').innerText()
await page.getByRole('button', { name: 'Dependency X-ray off' }).click()
if (await page.getByRole('button', { name: 'Dependency X-ray on' }).getAttribute('aria-pressed') !== 'true') errors.push('Dependency X-ray did not activate')
await page.getByRole('button', { name: 'Record fault' }).click()
await page.locator('.service-card.unavailable').waitFor()
await page.screenshot({ path: '../docs/geospatial/local-browser-fault.png', fullPage: true })
const after = await page.locator('.service-card').innerText()
console.log(JSON.stringify({ title: await page.title(), before, after, pageErrors: errors, screenshots: ['docs/geospatial/local-browser.png', 'docs/geospatial/local-browser-fault.png'] }))
await browser.close()
if (errors.length || !before.includes('All required assets operational') || !after.includes('Survey aircraft 01 is unavailable')) process.exitCode = 1
