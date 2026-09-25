// Headless smoke test: desktop + iPhone, every playable lineage, start to finale.
// Usage: npm run build && node scripts/smoke.mjs [gpt|claude ...]
// Screenshots land in smoke-shots/ (git-ignored). Exits non-zero on any console error.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'smoke-shots';
const lineages = process.argv.slice(2).length ? process.argv.slice(2) : ['gpt', 'claude'];
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(timer);
      resolve();
    }
  });
});

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const viewports = [
  { name: 'desktop', options: { viewport: { width: 1280, height: 800 } } },
  { name: 'iphone', options: { ...devices['iPhone 13'] } },
];

const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stage showcase: jump to a form, optionally trigger an event, and screenshot. */
const SHOWCASE = {
  gpt: [
    { form: 'gpt-3', label: 'stage1' },
    { form: 'codex', label: 'stage2-editor', editor: true },
    { form: 'chatgpt', label: 'stage3-current', event: 'first-surge' },
    { form: 'plugins', label: 'stage4-tools', event: 'autogpt' },
    { form: 'o1', label: 'stage5-think', think: true },
    { form: 'gpt-5.2', label: 'stage6-swarm', fork: true, event: 'openclaw-exposure' },
    { form: 'gpt-5.6-sol', label: 'stage7-frontier' },
  ],
  claude: [
    { form: 'claude-research', label: 'stage1' },
    { form: 'cai', label: 'stage2-constitution' },
    { form: 'claude-2', label: 'stage3-current' },
    { form: 'claude-3', label: 'stage4-sizeforms', event: 'golden-gate' },
    { form: 'claude-3.7', label: 'stage5-think', think: true },
    { form: 'opus-4.6', label: 'stage6-swarm', fork: true },
    { form: 'opus-5', label: 'stage7-frontier' },
  ],
};

for (const lineage of lineages) {
  for (const vp of viewports) {
    const tag = `${lineage}-${vp.name}`;
    const context = await browser.newContext(vp.options);
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    const shot = (name) => page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
    try {
      await page.goto(`${BASE}?debug`);
      await page.waitForSelector(`.lineage.${lineage}`);
      await shot('00-title');
      await page.click(`.lineage.${lineage}`);
      await page.waitForSelector('.modal .btn.primary');
      await sleep(400);
      await shot('01-intro');
      await page.click('.modal .btn.primary');
      await sleep(300);

      // Real input: keyboard on desktop, the on-screen joystick on touch.
      if (vp.name === 'desktop') {
        await page.keyboard.down('KeyW');
        await page.mouse.move(640, 400);
        await page.mouse.down();
        await page.mouse.move(700, 380, { steps: 5 });
        await page.mouse.up();
        await sleep(1500);
        await page.keyboard.up('KeyW');
      } else {
        const client = await context.newCDPSession(page);
        const touch = (type, x, y) =>
          client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
        await touch('touchStart', 80, 600);
        for (let i = 0; i < 10; i++) await touch('touchMove', 80, 600 - i * 5);
        await sleep(1200);
        await touch('touchEnd', 0, 0);
        await page.tap('.action-btn.boost');
      }
      await sleep(500);
      const moved = await page.evaluate(() => window.__emergence.state().eaten >= 0);
      if (!moved) throw new Error('debug API missing');
      await shot('02-playing');

      // Stage showcase.
      for (const s of SHOWCASE[lineage]) {
        const idx = await page.evaluate((id) => {
          const api = window.__emergence;
          return api.formIndexOf(id);
        }, s.form);
        if (idx < 0) throw new Error(`unknown form ${s.form}`);
        await page.evaluate((i) => window.__emergence.jump(i), idx);
        await sleep(600);
        if (s.event) {
          await page.evaluate((id) => window.__emergence.trigger(id), s.event);
          await sleep(1400);
        }
        if (s.fork) {
          await page.evaluate(() => {
            for (let i = 0; i < 3; i++) window.__emergence.fork();
          });
          await sleep(800);
        }
        if (s.think) {
          await page.evaluate(() => window.__emergence.hold('think', true));
          await sleep(700);
        }
        await shot(`10-${s.label}`);
        if (s.think) await page.evaluate(() => window.__emergence.hold('think', false));
        if (s.editor) {
          await page.evaluate(() => window.__emergence.tap('editor'));
          await sleep(500);
          await shot(`11-${s.label}-open`);
          await page.click('.editor .panel-body > button');
        }
        // Close whatever modal the showcase opened.
        await page.evaluate(() => window.__emergence.endEvent(true));
        for (let i = 0; i < 6 && (await page.$('.modal-backdrop')); i++) {
          await page.click('.modal-backdrop .btn');
          await sleep(200);
        }
      }

      // Fast-forward from the start to the finale through the real evolution path.
      await page.evaluate(() => {
        window.__emergence.setAuto(true);
        window.__emergence.jump(0);
      });
      let finished = false;
      for (let i = 0; i < 400 && !finished; i++) {
        await page.evaluate(() => window.__emergence.advance());
        await sleep(120);
        finished = await page.evaluate(() => window.__emergence.state().finished);
      }
      if (!finished) throw new Error('never reached the finale');
      await page.waitForSelector('.recap-screen');
      await sleep(300);
      await shot('99-recap');
    } catch (e) {
      failures.push(`${tag}: ${e.message}`);
      await shot('ERROR').catch(() => {});
    }
    if (errors.length) failures.push(`${tag}: console errors:\n  ${errors.join('\n  ')}`);
    console.log(`${tag}: ${errors.length ? 'errors' : 'ok'}`);
    await context.close();
  }
}

await browser.close();
server.kill();
if (failures.length) {
  console.error(`\nSMOKE FAILED\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nSMOKE PASSED');
process.exit(0);
