import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/mico/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const log = (m) => console.log('✓', m);
page.on('pageerror', e => console.log('✗ PAGE ERROR:', e.message));

await page.goto('file:///Users/mico/Projects/shadowing-app-proto/prototype.html');
await page.waitForTimeout(500);
await page.click('button:has-text("はじめる")');
await page.click('button:has-text("次へ")');
await page.waitForTimeout(300);

const words = ["I","don't","know","how","many","kinds","of","coffee","they","have","but","it's","a","lot"];
for (const w of words) { await page.click(`button.chip:not(.used):text-is("${w}")`); await page.waitForTimeout(50); }
await page.click('button:has-text("答え合わせ")');
await page.waitForTimeout(400);
await page.click('button:has-text("正解！次へ")');
await page.waitForTimeout(300);
await page.click('button:has-text("スキップ")');
await page.waitForTimeout(300);

// Step 4: 4ラウンド段階式
const expectBlankCounts = [2, 7, 11, 13];
for (let r = 1; r <= 4; r++) {
  log(`step4 round ${r}: ` + (await page.isVisible(`text=${r} / 4`) ? 'OK' : 'FAIL'));
  const blanks = await page.evaluate(() => S.blanks.length);
  log(`  blanks=${blanks} (expect ${expectBlankCounts[r-1]}): ` + (blanks === expectBlankCounts[r-1] ? 'OK' : 'FAIL'));
  await page.screenshot({ path: `shot-step4-r${r}.png` });
  await page.evaluate(() => applySpeakFill("i don't know how many kinds of coffee they have but it's a lot"));
  await page.waitForTimeout(300);
  log(`  voice-filled: ` + (await page.isVisible('text=全部言えた') ? 'OK' : 'FAIL'));
  await page.click(r < 4 ? 'button:has-text("次のラウンドへ")' : 'button:has-text("クリア！仕上げへ")');
  await page.waitForTimeout(300);
}

// Step 5: 3ラウンド（オーバーラッピング×1 → シャドーイング×2）
for (let r = 1; r <= 3; r++) {
  const expectLabel = r === 1 ? 'オーバーラッピング' : 'シャドーイング';
  log(`step5 round ${r}: ` + (await page.isVisible(`text=${r} / 3 — ${expectLabel}`) ? 'OK' : 'FAIL'));
  if (r === 2) log('  text hidden: ' + (await page.isVisible('text=文は隠したよ') ? 'OK' : 'FAIL'));
  await page.screenshot({ path: `shot-step5-r${r}.png` });
  await page.click(r < 3 ? 'button:has-text("できた、次へ")' : 'button:has-text("セッション完了！")');
  await page.waitForTimeout(300);
}

log('session done: ' + (await page.isVisible('text=1本クリア') ? 'OK' : 'FAIL'));
await browser.close();
console.log('ALL DONE');
