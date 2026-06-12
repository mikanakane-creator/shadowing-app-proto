import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/mico/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const log = (m) => console.log('✓', m);

await page.goto('file:///Users/mico/Projects/shadowing-app-proto/prototype.html');
await page.waitForTimeout(500);
await page.click('button:has-text("はじめる")');
await page.click('button:has-text("次へ")');
await page.waitForTimeout(300);

// 1語だけ正しく埋めて、残り2つは空のままタイマーを2秒に短縮
await page.click(`button.chip:not(.used):text-is("know")`);
await page.evaluate(() => { S.timeLeft = 2; });
await page.waitForTimeout(3500);

log('micro-drill shown: ' + (await page.isVisible('text=この単語だけ、いったん練習しよう') ? 'OK' : 'FAIL'));
await page.screenshot({ path: 'shot-10-drill.png' });

// ヒント3段階
await page.click('button:has-text("ヒント")');
await page.waitForTimeout(200);
await page.click('button:has-text("ヒント")');
await page.waitForTimeout(200);
log('hint meaning shown: ' + (await page.isVisible('text=意味：') ? 'OK' : 'FAIL'));
await page.screenshot({ path: 'shot-11-drill-hints.png' });

// 1語目クリア → 2語目へ
await page.click('text=言えたことにして進む');
await page.waitForTimeout(300);
log('drill word 2: ' + (await page.isVisible('text=この単語だけ') ? 'OK' : 'FAIL'));
await page.click('text=言えたことにして進む');
await page.waitForTimeout(400);

// タップ穴埋めに戻ってリトライ（knowは保持されてるはず）
const knowKept = await page.evaluate(() => Object.values(S.filled).includes('know'));
log('back to tap-fill, know kept: ' + (knowKept ? 'OK' : 'FAIL'));
const timerRestarted = await page.isVisible('#timer');
log('timer restarted: ' + (timerRestarted ? 'OK' : 'FAIL'));
await page.screenshot({ path: 'shot-12-retry.png' });

await browser.close();
console.log('DRILL TEST DONE');
