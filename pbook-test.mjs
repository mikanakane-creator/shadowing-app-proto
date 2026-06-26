import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/mico/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let errs = 0;
page.on('pageerror', e => { console.log('✗ PAGE ERROR:', e.message); errs++; });

await page.goto('file:///Users/mico/Projects/shadowing-app-proto/index.html');
await page.waitForTimeout(500);

const data = await page.evaluate(() => {
  const cols = ["c-pbook-basic", "c-pbook-office", "c-pbook-phone", "c-pbook-meeting"];
  return {
    collectionsExist: cols.map(id => ({ id, exists: !!collections.find(c => c.id === id), title: (collections.find(c => c.id === id) || {}).title })),
    counts: cols.map(id => ({ id, n: sentences.filter(s => s.collectionId === id).length })),
    total: sentences.filter(s => s.collectionId.startsWith("c-pbook")).length,
    // 自動生成が効いているか（kw/dummies）と意味の有無をサンプル確認
    sample: (() => {
      const s = sentences.find(x => x.id === 201);
      return s ? { id: s.id, text: s.text, kw: s.kw, dummies: s.dummies, meaningKeys: Object.keys(s.meanings || {}).length } : null;
    })(),
    // IDがMatt Cutts(101-)と衝突していないか
    idCollision: sentences.filter(s => s.collectionId.startsWith("c-pbook")).some(s => s.id < 201),
  };
});

console.log(JSON.stringify(data, null, 2));

// 検証
let pass = true;
const check = (label, cond) => { console.log((cond ? '✓ ' : '✗ ') + label); if (!cond) pass = false; };
check('page errors = 0', errs === 0);
data.collectionsExist.forEach(c => check(`collection ${c.id} exists (${c.title})`, c.exists));
check('basic = 7', data.counts.find(c => c.id === 'c-pbook-basic').n === 7);
check('office = 25', data.counts.find(c => c.id === 'c-pbook-office').n === 25);
check('phone = 25', data.counts.find(c => c.id === 'c-pbook-phone').n === 25);
check('meeting = 11', data.counts.find(c => c.id === 'c-pbook-meeting').n === 11);
check('total = 68', data.total === 68);
check('no id collision (<201)', data.idCollision === false);
check('auto kw generated', data.sample && data.sample.kw && data.sample.kw.length > 0);
check('auto dummies generated', data.sample && data.sample.dummies && data.sample.dummies.length > 0);
check('meanings present', data.sample && data.sample.meaningKeys > 0);

await browser.close();
console.log(pass ? '\nALL PASS' : '\nFAIL');
process.exit(pass ? 0 : 1);
