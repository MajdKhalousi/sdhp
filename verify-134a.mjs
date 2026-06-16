/**
 * Phase 134A Browser Verification
 * Uses same auth injection pattern as verify-133b.mjs (pre-fetch tokens, inject via localStorage).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:3001/api/v1';
const PASS = 'password123';

const tokenCache = {};
async function getToken(role) {
  if (tokenCache[role]) return tokenCache[role];
  const phones = {
    ACCOUNTANT: '+963912004001',
    TECHNICIAN: '+963912005001',
    SECRETARY:  '+963912002001',
  };
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({phone: phones[role], password: PASS}),
  });
  if (!r.ok) throw new Error(`Login failed for ${role}: HTTP ${r.status}`);
  const d = await r.json();
  tokenCache[role] = { token: d.accessToken, user: d.user };
  return tokenCache[role];
}

async function prefetchTokens() {
  for (const role of ['ACCOUNTANT', 'SECRETARY', 'TECHNICIAN']) {
    await getToken(role);
    console.log(`  ${role}: OK`);
  }
}

async function setAuthAndNavigate(page, role, targetPath) {
  const { token, user } = await getToken(role);
  const authState = JSON.stringify({ state: { token, user }, version: 0 });
  await page.goto(`${BASE}/en/login`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.evaluate((state) => localStorage.setItem('sdhp-auth', state), authState);
  let finalUrl;
  try {
    await page.goto(`${BASE}${targetPath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    finalUrl = page.url();
  } catch(e) {
    if (e.message?.includes('ERR_ABORTED')) {
      await page.waitForTimeout(2000);
      finalUrl = page.url();
    } else { throw e; }
  }
  return { finalUrl };
}

const results = [];
function log(label, passed, detail = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
  results.push({ label, passed, detail });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n=== Phase 134A Browser Verification ===\n');
  console.log('Pre-fetching tokens...');
  await prefetchTokens();
  console.log();

  // Get an invoice id for testing
  const { token: accToken } = await getToken('ACCOUNTANT');
  const listR = await fetch(`${API}/invoices?limit=1`, { headers: { Authorization: 'Bearer ' + accToken } });
  const list = await listR.json();
  const inv = list?.data?.[0];

  // ─── 1. Invoice detail page ───────────────────────────────────────────────
  console.log('--- Invoice Detail ---');
  if (!inv) {
    log('Invoice detail tests', false, 'No invoices in DB — skipped');
  } else {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      const { finalUrl } = await setAuthAndNavigate(page, 'ACCOUNTANT', `/en/dashboard/invoices/${inv.id}`);
      log('Invoice detail: page loads', finalUrl.includes('/invoices/'), `url: ${finalUrl}`);

      // Check print button href
      const printLink = page.locator('a[href*="/invoice/"][href*="/print"]').first();
      const href = await printLink.getAttribute('href').catch(() => '');
      log('Print button → /(print)/invoice/:id/print route', href.includes('/invoice/') && href.includes('/print'), `href: ${href}`);

      // Check Download PDF button
      const dlBtn = page.locator('button:has-text("Download PDF"), button:has-text("تنزيل PDF")').first();
      const dlVisible = await dlBtn.isVisible().catch(() => false);
      log('Download PDF button visible', dlVisible);

      await page.waitForTimeout(500);
      log('No JS errors on invoice detail', errors.length === 0, errors.slice(0, 2).join('; ') || 'clean');
    } catch (e) { log('Invoice detail page', false, e.message.slice(0, 120)); }
    await ctx.close();
  }

  // ─── 2. Cashier page: summary widget ────────────────────────────────────
  console.log('\n--- Cashier Page ---');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      const { finalUrl } = await setAuthAndNavigate(page, 'ACCOUNTANT', '/en/dashboard/cashier');
      log('Cashier page: loads', finalUrl.includes('/cashier'), `url: ${finalUrl}`);

      const bodyText = await page.textContent('body').catch(() => '');

      // Summary section present
      log('Today Summary widget present', bodyText.includes('Today Summary'), 'text check');

      // Tabs still exist
      const todayTab = page.locator('button:has-text("Today")').first();
      log('Tabs still present', await todayTab.isVisible().catch(() => false));

      // Collected today label exists (from summary bar)
      log('Collected today label renders', bodyText.includes('Collected today'));

      await page.waitForTimeout(500);
      log('No JS errors on cashier page', errors.length === 0, errors.slice(0, 2).join('; ') || 'clean');
    } catch (e) { log('Cashier page', false, e.message.slice(0, 120)); }
    await ctx.close();
  }

  // ─── 3. Arabic locale cashier ────────────────────────────────────────────
  console.log('\n--- Arabic Locale ---');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const { token, user } = await getToken('ACCOUNTANT');
      const authState = JSON.stringify({ state: { token, user }, version: 0 });
      await page.goto(`${BASE}/ar/login`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.evaluate((s) => localStorage.setItem('sdhp-auth', s), authState);
      await page.goto(`${BASE}/ar/dashboard/cashier`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(4000);

      const bodyText = await page.textContent('body').catch(() => '');
      log('Arabic cashier: Arabic summary label renders', bodyText.includes('ملخص اليوم'), `found: ${bodyText.includes('ملخص اليوم')}`);
      log('Arabic cashier: Arabic tab label renders', bodyText.includes('اليوم') || bodyText.includes('Today'));
    } catch (e) { log('Arabic cashier', false, e.message.slice(0, 120)); }
    await ctx.close();
  }

  // ─── 4. Print page: existing route still works ────────────────────────────
  console.log('\n--- Print Page ---');
  if (!inv) {
    log('Print page: renders', false, 'No invoices — skipped');
  } else {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // Print route is public-ish — needs auth in localStorage
      const { token, user } = await getToken('ACCOUNTANT');
      const authState = JSON.stringify({ state: { token, user }, version: 0 });
      await page.goto(`${BASE}/en/login`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.evaluate((s) => localStorage.setItem('sdhp-auth', s), authState);

      await page.goto(`${BASE}/en/invoice/${inv.id}/print`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      const bodyText = await page.textContent('body').catch(() => '');
      const hasContent = bodyText.length > 1000 && !bodyText.includes('404 Not Found') && !bodyText.includes('page not found');
      const hasInvNum = bodyText.includes(inv.invoiceNumber);
      log('Print page: loads without error', hasContent, `body length: ${bodyText.length}`);
      log('Print page: shows invoice number', hasInvNum, `inv#: ${inv.invoiceNumber}`);
    } catch (e) { log('Print page', false, e.message.slice(0, 120)); }
    await ctx.close();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.label} — ${r.detail}`));
  }
  console.log(`\nVerdict: ${failed === 0 ? 'PASS' : 'FAIL'}`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
