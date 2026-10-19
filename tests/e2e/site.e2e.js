// Testes ponta a ponta no Chromium (Playwright): abrem o site gerado pelo build
// e usam como um visitante usaria, no computador e no celular.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { serve } from './server.mjs';

const STUB = readFileSync(new URL('./three-stub.js', import.meta.url), 'utf8');
let browser, server;

before(async () => {
  server = await serve();
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

/** Abre o site; o three.js do CDN é trocado pelo stub e as fontes externas são bloqueadas. */
async function open(ctxOpts = { viewport: { width: 1440, height: 900 } }) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/three.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(server.url);
  return { ctx, page, errors };
}
const ready = (page) => page.waitForSelector('#ld.done', { state: 'attached', timeout: 6000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('abertura: fundo preto com o contador 000 centralizado, sem logo', async () => {
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(150);
  const s = await page.evaluate(() => {
    const ld = document.querySelector('#ld'), ln = document.querySelector('#ln'), r = ln.getBoundingClientRect();
    return {
      bg: getComputedStyle(ld).backgroundColor,
      logo: getComputedStyle(document.querySelector('#ldl')).display,
      text: ln.textContent,
      cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: innerWidth, h: innerHeight,
    };
  });
  assert.match(s.text, /^\d{3}$/);
  assert.equal(s.logo, 'none');
  const [r, g, b] = s.bg.match(/\d+/g).map(Number);
  assert.ok(r + g + b < 40, `fundo escuro (${s.bg})`);
  assert.ok(Math.abs(s.cx - s.w / 2) < 30 && Math.abs(s.cy - s.h / 2) < 30, 'contador centralizado');
  await ready(page);
  assert.equal(await page.locator('#ln').textContent(), '100');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('percorre o site inteiro sem erros de JavaScript', async () => {
  const { ctx, page, errors } = await open();
  await ready(page);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H; y += 700) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await sleep(40);
  }
  await sleep(300);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('computador: cada giro da roda do mouse avança exatamente uma janela', async () => {
  const { ctx, page } = await open();
  await ready(page);
  const Y = await page.evaluate(() => SN.Ys());
  await page.evaluate((y) => scrollTo(0, y), Y[0]);
  await sleep(700);
  await page.mouse.move(700, 450);
  for (const k of [1, 2]) {
    await page.mouse.wheel(0, 120);
    await page.waitForFunction((t) => Math.abs(scrollY - t) < 3, Y[k], { timeout: 3000 });
    await sleep(750); // trava contra a inércia do trackpad
  }
  await page.mouse.wheel(0, -120);
  await page.waitForFunction((t) => Math.abs(scrollY - t) < 3, Y[1], { timeout: 3000 });
  await ctx.close();
});

test('Acervo: abas na ordem certa e filtro por categoria', async () => {
  const { ctx, page } = await open();
  await ready(page);
  assert.deepEqual(await page.locator('#filters button').allTextContents(), ['Todos', 'Filmes', 'Empreendimentos', 'Exteriores', 'Interiores']);
  const titles = await page.locator('#grid .t h4').allTextContents();
  assert.deepEqual(titles.slice(0, 9), ['Vale dos Barões', 'Miradouro by Chartuni', 'Costa Dourada', 'Resort Aracê', 'Miradouro', 'Essenza da Mata', 'Espraiado', 'Porto Villa Residence', 'Santa Julia']);
  await page.locator('#filters button', { hasText: 'Filmes' }).click();
  assert.equal(await page.locator('#grid .t:not(.hide)').count(), 4);
  await page.locator('#filters button', { hasText: 'Interiores' }).click();
  assert.deepEqual(await page.locator('#grid .t:not(.hide) h4').allTextContents(), ['Sala Arcus', 'Sala Origem']);
  await page.locator('#filters button', { hasText: 'Todos' }).click();
  assert.equal(await page.locator('#grid .t:not(.hide)').count(), titles.length);
  await ctx.close();
});

test('galeria: abre, navega pelas setas e teclado, fecha com Esc', async () => {
  const { ctx, page, errors } = await open();
  await ready(page);
  await page.locator('#grid .t', { hasText: 'Espraiado' }).click();
  await page.waitForSelector('#lb.open');
  assert.equal(await page.locator('#gc').textContent(), '01 / 08');
  assert.equal(await page.locator('#lbt h3').textContent(), 'Espraiado');
  await page.locator('#gn').click();
  assert.equal(await page.locator('#gc').textContent(), '02 / 08');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#gc').textContent(), '08 / 08');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#lb:not(.open)', { state: 'attached' });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('filme: "uma tomada" — sem setas nem contador, com player próprio e cursor normal', async () => {
  const { ctx, page } = await open();
  await ready(page);
  await page.locator('#grid .t', { hasText: 'Vale dos Barões' }).click();
  await page.waitForSelector('#lb.open .fc');
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lbo')));
  for (const q of ['#gp', '#gn', '#gc']) assert.equal(await page.locator(q).isVisible(), false, q);
  assert.equal(await page.locator('.fc-t').textContent(), '00:00 / 05:33');
  assert.equal(await page.locator('#lbm video').evaluate((v) => v.controls), false);
  await page.keyboard.press('Escape');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('lbo'))));
  await ctx.close();
});

test('contato: WhatsApp, e-mail e Instagram corretos', async () => {
  const { ctx, page } = await open();
  const hrefs = await page.locator('#contato .contacts a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  assert.deepEqual(hrefs, ['https://wa.me/5521985114060', 'mailto:vmstudio3ds@gmail.com', 'https://instagram.com/vm.studio3ds']);
  assert.match(await page.locator('#sobre p').textContent(), /cada projeto nasce da luz/);
  await ctx.close();
});

for (const name of ['iPhone 13', 'Pixel 7']) {
  test(`celular (${name}): encaixe nativo por janela e nada vaza para os lados`, async () => {
    const { ctx, page, errors } = await open({ ...devices[name] });
    await ready(page);
    const s = await page.evaluate(() => ({
      snap: document.documentElement.classList.contains('snapy'),
      marks: document.querySelectorAll('#snaps .snapm').length,
      n: PN.length,
      over: document.documentElement.scrollWidth - innerWidth,
    }));
    assert.ok(s.snap, 'scroll-snap ligado no percurso');
    assert.equal(s.marks, s.n + 3, 'logo + uma marca por janela + título + Acervo');
    assert.ok(s.over <= 0, `rolagem horizontal de ${s.over}px`);
    await page.evaluate(() => scrollTo(0, document.querySelector('#acervo').offsetTop));
    await sleep(200);
    assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('snapy'))), 'snap desligado no Acervo');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
