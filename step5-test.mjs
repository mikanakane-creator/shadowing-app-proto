import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/mico/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const log = (m) => console.log('✓', m);
page.on('pageerror', e => console.log('✗ PAGE ERROR:', e.message));

await page.goto('file:///Users/mico/Projects/shadowing-app-proto/prototype.html');
await page.waitForTimeout(500);
// Step5に直接ジャンプ
await page.evaluate(() => { startSession(1); S.round = 1; renderStep5(); });
await page.waitForTimeout(200);
log('round 1: ' + (await page.isVisible('text=1 / 2 — オーバーラッピング') ? 'OK' : 'FAIL'));
await page.click('button:has-text("できた、次へ")');
await page.waitForTimeout(200);
log('round 2: ' + (await page.isVisible('text=2 / 2 — シャドーイング') ? 'OK' : 'FAIL'));
log('text hidden: ' + (await page.isVisible('text=文は隠したよ') ? 'OK' : 'FAIL'));
await page.click('button:has-text("セッション完了！")');
await page.waitForTimeout(300);
log('session done: ' + (await page.isVisible('text=1本クリア') ? 'OK' : 'FAIL'));
await browser.close();
console.log('DONE');
