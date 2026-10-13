import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
const port = new URL(baseUrl).port || '4173'
const previewMode = process.argv.includes('--preview')
const playwrightArgs = process.argv.slice(2).filter((argument) => argument !== '--preview')
const viteArgs = [path.join(root, 'node_modules/vite/bin/vite.js'), ...(previewMode ? ['preview'] : []), '--host', '127.0.0.1', '--port', port, '--strictPort']
const vite = spawn(process.execPath, viteArgs, { cwd: root, stdio: 'inherit', windowsHide: true })
let playwright

function stop(child) {
  if (child && child.exitCode === null) child.kill()
}

const stopOnInterrupt = () => {
  process.exitCode = 130
  stop(playwright)
  stop(vite)
}
process.once('SIGINT', stopOnInterrupt)

try {
  let ready = false
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (vite.exitCode !== null) throw new Error(`Vite exited with code ${vite.exitCode}`)
    try { const response = await fetch(baseUrl); if (response.ok) { ready = true; break } } catch { /* wait for Vite to start */ }
    await sleep(250)
  }
  if (!ready) throw new Error(`Vite did not become ready at ${baseUrl}`)

  playwright = spawn(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', ...playwrightArgs], { cwd: root, stdio: 'inherit', env: process.env, windowsHide: true })
  const code = await new Promise((resolve, reject) => {
    playwright.once('error', reject)
    playwright.once('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)))
  })
  process.exitCode = code
} finally {
  process.removeListener('SIGINT', stopOnInterrupt)
  stop(playwright)
  stop(vite)
}
