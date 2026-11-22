// Full API-backed browser regression, with AI response variation simulated locally.
// No vendor calls, credentials, real Google account, or persistent database needed.
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = 'http://localhost:3118';
const key = 'branvidia:chat-session-v2';
const env = { ...process.env, PORT: '3118', USE_MOCK: 'true', NEXT_PUBLIC_USE_MOCK: 'true', RATE_LIMIT_PER_MINUTE: '1000' };
for (const name of ['LLM_API_KEY', 'MONGODB_URI', 'TOKEN_ENCRYPTION_KEY']) delete env[name];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3118'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', data => output += data);
server.stderr.on('data', data => output += data);
async function main() {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(output)), 20000);
    server.stdout.on('data', () => { if (output.includes('Ready in')) { clearTimeout(timer); resolve(); } });
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  let checks = 0;
  try {
    for (const entry of ['/', '/assistant']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      // Exercise the real API, varying only the two nondeterministic AI outputs.
      await context.route('**/api/chat/**', async route => {
        const request = route.request();
        let response;
        if (request.url().endsWith('/message')) {
          const body = request.postDataJSON();
          body.input = body.input.replace(/^My answer is /, '');
          response = await route.fetch({ postData: JSON.stringify(body) });
        } else response = await route.fetch();
        assert.equal(response.status(), 200);
        const body = await response.json();
        if (body.replies) body.replies = body.replies.map(m => m.kind === 'text' ? { ...m, text: 'AI wording: ' + m.text } : m);
        await route.fulfill({ response, json: body });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + entry);
      const input = page.getByRole('textbox', { name: 'Your message' });
      await page.waitForFunction(() => document.querySelector('#chat-input') && !document.querySelector('#chat-input').disabled);
      for (const answer of ['Test Café', 'Café', 'Coffee and cakes', 'Families', 'Better reviews']) {
        await input.fill('My answer is ' + answer);
        await page.getByRole('button', { name: 'Send message' }).click();
        await page.waitForFunction(k => {
          const value = JSON.parse(sessionStorage.getItem(k) || 'null');
          return value?.messages.at(-1)?.role === 'assistant' && !document.querySelector('#chat-input')?.disabled;
        }, key);
        const before = await page.evaluate(k => sessionStorage.getItem(k), key);
        const saved = JSON.parse(before);
        assert.equal(saved.messages.filter(m => m.role === 'user').at(-1).intakeValue, answer); checks++;
        await page.reload();
        await page.getByRole('button', { name: 'Start over', exact: true }).waitFor();
        await page.waitForFunction(k => sessionStorage.getItem(k) !== null, key);
        assert.deepEqual(await page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), key), JSON.parse(before)); checks++;
      }
      await page.getByRole('button', { name: 'Connect Google', exact: true }).last().click();
      await page.getByRole('button', { name: /Priya Ramesh/ }).click();
      await page.getByRole('button', { name: 'Allow', exact: true }).click();
      await page.getByRole('button', { name: /Indiranagar/ }).click();
      await page.getByRole('button', { name: 'Analyse this business' }).click();
      await page.waitForURL('**/report/**', { timeout: 60000 });
      await page.getByText('Optimization report', { exact: true }).waitFor(); checks++;
      await page.screenshot({ path: `/downloads/branvidia-fixed-${entry === '/' ? 'homepage' : 'assistant'}.png`, fullPage: true });
      await page.screenshot({ path: `/downloads/branvidia-fixed-${entry === '/' ? 'homepage' : 'assistant'}-viewport.png` });
      const reportURL = page.url();
      await page.reload();
      await page.getByText('Optimization report', { exact: true }).waitFor();
      assert.equal(page.url(), reportURL); checks++;
      await page.goto(base + '/dashboard');
      await page.getByRole('link', { name: /View report/ }).first().waitFor(); checks++;
      assert.deepEqual(errors, []); checks++;
      console.log(`PASS ${entry}: AI wording, extracted answers, refresh after all five turns, Google mock consent, analysis, report refresh, dashboard, no page errors`);
      await context.close();
    }
    console.log(`ALL PASS: ${checks} API-backed browser assertions`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.kill());
