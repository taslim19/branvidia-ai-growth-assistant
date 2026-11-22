/**
 * End-to-end run: chat -> consent -> analysis -> report -> dashboard.
 * Works against either mode; TEST_BASE_URL picks the server.
 *
 *   Mock mode (client-side mock):        TEST_BASE_URL=http://localhost:3108 node tests/e2e.cjs
 *   Live-backend mode (API_BASE=/api):   TEST_BASE_URL=http://localhost:3100 node tests/e2e.cjs
 */
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
let checks = 0;
const check = (v, msg) => { assert.ok(v, msg); checks++; };
const wait = async (page, text) => page.getByText(text, { exact: false }).first().waitFor();
async function answer(page, text) {
  await page.getByRole('textbox', { name: 'Your message' }).fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('textbox', { name: 'Your message' }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#chat-input').disabled);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 360, height: 780 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Chat: the full five-question intake.
    await page.goto(base);
    await wait(page, 'First, what’s your business called?');
    const answers = ['E2E Café', 'Café', 'Coffee, cakes', 'Families', 'Better reviews'];
    const questions = ['What kind of business', 'What do you mainly', 'Who are your usual', 'Last one:'];
    for (let i = 0; i < answers.length; i++) {
      await answer(page, answers[i]);
      if (i < 4) await wait(page, questions[i]);
      else await page.getByRole('button', { name: 'Connect Google', exact: true }).first().waitFor();
    }
    console.log('PASS chat: five answers reach the opt-in card');

    // Consent: simulated account picker and allow.
    await page.locator('[aria-label="Conversation with the Branvidia assistant"]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.getByRole('button', { name: 'Connect Google', exact: true }).last().click();
    await wait(page, 'Choose a Google account');
    await page.getByRole('button', { name: /Priya Ramesh/ }).click();
    await wait(page, 'Branvidia wants read-only access');
    await page.getByRole('button', { name: 'Allow', exact: true }).click();
    await wait(page, 'Which business');
    await page.getByRole('button', { name: /Indiranagar/ }).click();
    console.log('PASS consent: account picker, allow, location pick');

    // Analysis -> report.
    await page.getByRole('button', { name: 'Analyse this business' }).click();
    await page.waitForURL('**/report/**', { timeout: 90000 });
    await wait(page, 'Optimization report');
    check((await page.locator('main').innerText()).includes('E2E Café'), 'report uses the intake business name');
    console.log('PASS analysis: report rendered with intake name');

    // Report refresh stays readable; last-report card on landing.
    const reportURL = page.url();
    await page.reload();
    await wait(page, 'Optimization report');
    check(page.url() === reportURL, 'report refresh stays on report');
    await page.goto(base);
    await wait(page, 'Your last report is ready');
    console.log('PASS report: refresh stable, landing shows ready card');

    // Dashboard lists the generated report.
    await page.goto(base + '/dashboard');
    await wait(page, 'E2E Café');
    console.log('PASS dashboard: generated report listed');

    check(errors.length === 0, `no uncaught page errors: ${errors}`);
    console.log(`ALL PASS: ${checks} checks`);
  } catch (e) {
    for (const ctx of browser.contexts()) for (const p of ctx.pages()) {
      await p.screenshot({ path: '/tmp/e2e-failure.png' });
    }
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
