import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Users/mico/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

let pass = 0, fail = 0;
const ok = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};

await page.goto('http://localhost:8787/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(300);

// --- ホーム ---
console.log('1. ホーム画面（コレクション一覧）');
const homeTxt0 = await page.textContent('#app');
ok('お試しコレクション表示', homeTxt0.includes('お試し3文'));
ok('Matt Cuttsコレクション表示', homeTxt0.includes('30日間チャレンジ'));
ok('進捗 0 / 30', homeTxt0.includes('0'));

// --- 設定 ---
console.log('2. 設定画面');
await page.click('text=⚙️');
await page.waitForTimeout(200);
ok('設定画面が開く', (await page.textContent('#app')).includes('OpenAI APIキー'));
// プロバイダ切替
await page.selectOption('#setProvider', 'google');
await page.waitForTimeout(200);
ok('Google切替でCloud TTSキー欄', (await page.textContent('#app')).includes('Cloud TTS APIキー'));
ok('Cloud TTS声リスト (Neural2)', (await page.textContent('#setVoice')).includes('Neural2-F'));
await page.selectOption('#setVoice', 'en-US-Neural2-J');
await page.selectOption('#setProvider', 'openai');
await page.waitForTimeout(200);
ok('OpenAIに戻せる', (await page.textContent('#app')).includes('OpenAI APIキー'));

await page.fill('#setGoal', '40');
await page.selectOption('#setVoice', 'shimmer');
await page.click('button.btn-primary:has-text("保存")');
await page.waitForTimeout(200);
ok('保存メッセージ', (await page.textContent('#app')).includes('保存しました'));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sw_settings')));
ok('goal=40 永続化', saved.goal === 40);
ok('voice=shimmer 永続化', saved.voice === 'shimmer');
await page.click('text=‹');
await page.waitForTimeout(200);
ok('ホームに goal 40 反映', (await page.textContent('#app')).includes('/ 40'));

// --- コレクション開く ---
console.log('3. コレクション詳細');
await page.click('text=お試し3文');
await page.waitForTimeout(200);
const colTxt = await page.textContent('#app');
ok('コレクション詳細を開ける', colTxt.includes('お試し3文'));
ok('中に3文表示', (await page.locator('.en').count()) >= 3);
await page.click('text=‹');
await page.waitForTimeout(200);

// --- コレクション追加 ---
console.log('4. コレクション追加');
await page.click('text=＋ 追加');
await page.waitForTimeout(200);
await page.fill('#addTitle', 'テスト集');
await page.fill('#addText', 'The weather has been really nice this week. Tomorrow is going to be sunny too. I love sunny days.');
await page.click('#addBtn');
await page.waitForTimeout(400);
const colNow = await page.evaluate(() => JSON.parse(localStorage.getItem('sw_collections')));
ok('コレクション3つに', colNow.length === 3);
const newSents = await page.evaluate(() => JSON.parse(localStorage.getItem('sw_sentences')));
const testColId = colNow[colNow.length - 1].id;
const newColSents = newSents.filter(s => s.collectionId === testColId);
ok(`新コレクションに3文 (${newColSents.length})`, newColSents.length === 3);
ok('自動キーワードあり', newColSents[0].kw && newColSents[0].kw.length >= 2);

await page.evaluate(() => goHome());
await page.waitForTimeout(200);

// --- セッションフロー（お試し1文目）---
console.log('5. セッションフロー');
await page.evaluate(() => startSession(sentences.find(s => s.collectionId === 'c-sample').id));
await page.waitForTimeout(200);
ok('Step1 表示', (await page.textContent('#app')).includes('Step 1'));
await page.click('text=次へ');
await page.waitForTimeout(200);
ok('Step2 ディクテーション', (await page.textContent('#app')).includes('ディクテーション'));
const blanksCount = await page.evaluate(() => S.blanks.length);
const wordsTotal = await page.evaluate(() => wordCount(S.sentence.text));
ok(`全単語が空欄 (${blanksCount}/${wordsTotal})`, blanksCount === wordsTotal);

// 全部正しく埋める
await page.evaluate(() => {
  const tokens = tokenize(S.sentence.text);
  S.blanks.forEach(i => { S.filled[i] = tokens[i].core; });
  renderTapFill();
});
await page.click('text=答え合わせ');
await page.waitForTimeout(200);
ok('正解表示', (await page.textContent('#app')).includes('正解！次へ'));
await page.click('text=正解！次へ');
await page.waitForTimeout(300);
const meaningTxt = await page.textContent('#app');
ok('意味の確認画面', meaningTxt.includes('意味の確認'));
ok('日本語訳表示', meaningTxt.includes('何種類のコーヒー'));
ok('単語の意味リスト', meaningTxt.includes('単語の意味'));
await page.click('text=意味OK、音読へ');
await page.waitForTimeout(200);
ok('Step3 音読', (await page.textContent('#app')).includes('Step 3'));

// Step3 → Step4（スキップ/OKで進む）
await page.evaluate(() => gotoSpeakFill());
await page.waitForTimeout(200);
ok('Step4 R1', (await page.textContent('#app')).includes('1 / 4'));
const r1 = await page.evaluate(() => S.blanks.length);
ok(`R1 穴2つ (${r1})`, r1 === 2);

// === Step 4 新機能テスト ===
console.log('4b. Step 4 リアルタイム＆peek');
// R1で半分だけ読んだ状態 → heardに入って既出単語が緑になることを確認
await page.evaluate(() => {
  const half = S.sentence.text.split(' ').slice(0, 5).join(' ');
  applySpeakFill(half);
});
await page.waitForTimeout(200);
const heardSize = await page.evaluate(() => S.heard.size);
ok(`認識単語が蓄積 (${heardSize})`, heardSize >= 3);
const greenCount = await page.evaluate(() => document.querySelectorAll('.word-heard').length);
ok(`非空白の既読単語が緑 (${greenCount})`, greenCount >= 1);

// peek機能：空白タップで答えチラ見
await page.evaluate(() => {
  S.filled = {}; S.heard = new Set(); S.peeked = {};
  renderSpeakFill();
  const firstBlank = S.blanks.find(i => !S.filled[i]);
  peekBlank(firstBlank);
});
await page.waitForTimeout(200);
const peekCount = await page.evaluate(() => Object.keys(S.peeked).length);
ok(`peek状態が記録 (${peekCount})`, peekCount === 1);
ok('peekはまだ通過させない', !(await page.textContent('#app')).includes('全部言えた'));
// peekした空白を発音 → 緑になりpeek解除
await page.evaluate(() => {
  const i = parseInt(Object.keys(S.peeked)[0]);
  const w = tokenize(S.sentence.text)[i].core;
  applySpeakFill(w);
});
await page.waitForTimeout(200);
const peekAfter = await page.evaluate(() => Object.keys(S.peeked).length);
ok('発音でpeek解除', peekAfter === 0);

// 各ラウンドを音声入力シミュレートでクリア
for (let r = 1; r <= 4; r++) {
  await page.evaluate(() => applySpeakFill(S.sentence.text));
  await page.waitForTimeout(200);
  const txt = await page.textContent('#app');
  ok(`R${r} 全部埋まる`, txt.includes('全部言えた'));
  await page.click(r === 4 ? 'text=クリア！仕上げへ' : 'text=次のラウンドへ');
  await page.waitForTimeout(200);
}
ok('Step5 オーバーラッピング', (await page.textContent('#app')).includes('オーバーラッピング'));
await page.click('text=できた、次へ');
await page.waitForTimeout(200);
ok('Step5 シャドーイング（文非表示）', (await page.textContent('#app')).includes('文は隠したよ'));
await page.click('text=セッション完了！');
await page.waitForTimeout(300);
ok('完了画面', (await page.textContent('#app')).includes('1本クリア'));
await page.click('text=次のセンテンスへ');
await page.waitForTimeout(200);
const colAfterTxt = await page.textContent('#app');
ok('セッション完了後コレクション画面に戻る', colAfterTxt.includes('お試し3文'));
ok('進捗反映', colAfterTxt.includes('✓ 完了'));
const sampleSentId = await page.evaluate(() => sentences.find(s => s.collectionId === 'c-sample').id);
const expectedWords = await page.evaluate((id) => wordCount(sentences.find(s => s.id === id).text), sampleSentId);
const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('sw_progress')));
ok(`ワード数加算 (${prog.words})`, prog.words === expectedWords);
await page.evaluate(() => goHome());
await page.waitForTimeout(200);

// --- リロード後の永続化 ---
console.log('6. 永続化');
await page.reload();
await page.waitForTimeout(300);
const after = await page.textContent('#app');
ok('リロード後もコレクション一覧表示', after.includes('お試し3文') && after.includes('30日間チャレンジ'));
ok('リロード後も追加コレクション保持', after.includes('テスト集'));

// --- 削除 ---
console.log('6. 文の削除');
page.on('dialog', d => d.accept());
const before = await page.evaluate(() => sentences.length);
await page.evaluate(() => {
  const id = sentences[sentences.length - 1].id;
  window.confirm = () => true;
  removeSentence(id);
});
await page.waitForTimeout(200);
const afterDel = await page.evaluate(() => JSON.parse(localStorage.getItem('sw_sentences')).length);
ok(`削除で ${before}→${afterDel}`, afterDel === before - 1);

// === 開発スキップ ===
console.log('7. 開発スキップボタン');
await page.evaluate(() => startSession(sentences[1].id));
await page.waitForTimeout(200);
ok('Step1からskipでStep2へ', (await page.evaluate(() => { devSkip(); return S.step; })) === 2);
ok('Step2からskipで意味画面へ', (await page.evaluate(() => { devSkip(); return S.step; })) === 2.5);

await page.screenshot({ path: 'shot-index-home.png' });
await browser.close();
console.log(`\n結果: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
