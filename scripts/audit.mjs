import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch as launchChrome } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(await readFile(path.join(root, 'config/lighthouse.json'), 'utf8'))
const outputDir = path.join(root, 'outputs', 'lighthouse')
const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173'
const preview = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'ignore', env: process.env })

async function waitForPreview() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { await fetch(baseUrl); return }
    catch { await sleep(500) }
  }
  throw new Error('Vite preview did not become ready at ' + baseUrl)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
}

function metric(report, id) {
  const value = report.audits[id]?.numericValue
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

let chrome
try {
  await access(path.join(root, 'dist', 'index.html'))
  await mkdir(outputDir, { recursive: true })
  await waitForPreview()
  // Keep ChromeLauncher’s default flag list out of Lighthouse runs. On the
  // supplied Windows Chrome build those flags abort the MSW service-worker
  // startup, leaving the page blank and Lighthouse with a misleading NO_FCP.
  chrome = await launchChrome({ chromePath: process.env.CHROME_PATH, ignoreDefaultFlags: true, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run'] })
  const lighthousePackage = JSON.parse(await readFile(path.join(root, 'node_modules/lighthouse/package.json'), 'utf8'))
  const summary = { generatedAt: new Date().toISOString(), baseUrl, scenario: config.scenario, configVersion: config.version, lighthouseVersion: lighthousePackage.version, browserVersion: chrome.version, environment: { platform: process.platform, arch: process.arch, node: process.version }, results: [] }

  for (const pagePath of config.pages) {
    for (const [profileName, profile] of Object.entries(config.profiles)) {
      const runs = []
      for (let run = 1; run <= config.runsPerPageAndProfile; run += 1) {
        const targetUrl = new URL(pagePath, baseUrl)
        targetUrl.searchParams.set('scenario', config.scenario)
        const result = await lighthouse(targetUrl.href, {
          port: chrome.port,
          output: ['html', 'json'],
          logLevel: 'error',
          onlyCategories: config.categories,
          throttlingMethod: config.throttlingMethod,
          formFactor: profile.formFactor,
          screenEmulation: profile.screenEmulation,
          ...(profile.throttling ? { throttling: profile.throttling } : {}),
          ...(profile.emulatedUserAgent ? { emulatedUserAgent: profile.emulatedUserAgent } : {}),
        })
        if (result.lhr.runtimeError) {
          throw new Error(`Lighthouse failed for ${targetUrl.href} (${profileName}, run ${run}): ${result.lhr.runtimeError.code} — ${result.lhr.runtimeError.message}`)
        }
        const [html, jsonText] = Array.isArray(result.report) ? result.report : [result.report, JSON.stringify(result.lhr)]
        const report = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
        const stem = `${pagePath === '/' ? 'home' : 'nft-detail'}-${profileName}-run-${run}`
        const missingCategories = config.categories.filter((category) => !Number.isFinite(report.categories[category]?.score))
        if (missingCategories.length) throw new Error(`Lighthouse report ${stem} is missing valid scores for: ${missingCategories.join(', ')}`)
        await writeFile(path.join(outputDir, `${stem}.html`), html)
        await writeFile(path.join(outputDir, `${stem}.json`), JSON.stringify(report, null, 2))
        const scores = Object.fromEntries(config.categories.map((category) => [category, Math.round((report.categories[category]?.score ?? 0) * 100)]))
        runs.push({ run, scores, lcpMs: metric(report, 'largest-contentful-paint'), cls: metric(report, 'cumulative-layout-shift'), tbtMs: metric(report, 'total-blocking-time') })
        console.log(`${stem}: performance ${scores.performance}, accessibility ${scores.accessibility}, best-practices ${scores['best-practices']}, seo ${scores.seo}`)
      }
      const row = {
        page: pagePath,
        profile: profileName,
        runs,
        medianScores: Object.fromEntries(config.categories.map((category) => [category, median(runs.map((run) => run.scores[category]))])),
        medianLcpMs: median(runs.map((run) => run.lcpMs).filter((value) => value !== null)),
        medianCls: median(runs.map((run) => run.cls).filter((value) => value !== null)),
        medianTbtMs: median(runs.map((run) => run.tbtMs).filter((value) => value !== null)),
      }
      summary.results.push(row)
    }
  }

  await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
  const rows = summary.results.map((row) => `| ${row.page} | ${row.profile} | ${row.medianScores.performance} | ${row.medianScores.accessibility} | ${row.medianScores['best-practices']} | ${row.medianScores.seo} | ${row.medianLcpMs} | ${row.medianCls} | ${row.medianTbtMs} |`).join('\n')
  const markdown = `# Lighthouse audit\n\n- Generated: ${summary.generatedAt}\n- Lighthouse: ${summary.lighthouseVersion}\n- Browser: ${summary.browserVersion}\n- Scenario: ${summary.scenario}\n- Method: ${config.throttlingMethod}; 3 runs per page and profile\n\n| Page | Profile | Perf. | A11y | Best practices | SEO | LCP ms | CLS | TBT ms |\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n`
  await writeFile(path.join(outputDir, 'summary.md'), markdown)
} finally {
  if (chrome) await chrome.kill()
  preview.kill()
}
