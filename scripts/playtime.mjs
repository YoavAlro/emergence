// Estimates playtime: an autopilot bot plays a lineage with real mechanics (events,
// storms, gates) at N× simulation speed and reports simulated minutes per era.
// Usage: npm run build && node scripts/playtime.mjs gpt [steps=4] [maxRealMinutes=40]
import { chromium } from 'playwright';
import { preview } from 'vite';

const [lineage = 'gpt', steps = '4', maxMin = '40', startForm = ''] = process.argv.slice(2);
const server = await preview({ preview: { port: Number(process.env.PT_PORT || 4180), strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${process.env.PT_PORT || 4180}/?debug`);
await page.click(`.lineage.${lineage}`);
await page.waitForSelector('.modal .btn.primary');
await page.click('.modal .btn.primary');
if (startForm) await page.evaluate((id) => window.__emergence.jump(window.__emergence.formIndexOf(id)), startForm);
await page.evaluate((n) => window.__emergence.bot(true, n), Number(steps));
const start = Date.now();
let last = -1;
let tick = 0;
while (Date.now() - start < Number(maxMin) * 60_000) {
  await new Promise((r) => setTimeout(r, 5000));
  const s = await page.evaluate(() => window.__emergence.state());
  if (s.formIndex !== last) {
    last = s.formIndex;
    const sim = s.run.log.playSeconds / 60;
    console.log(`${new Date().toISOString().slice(11, 19)} form ${s.formIndex} ${s.formId} · sim ${sim.toFixed(1)} min · users ${Math.round(s.run.users)} · align ${Math.round(s.run.alignment)} · trust ${Math.round(s.run.trust)}`);
  }
  if (++tick % 6 === 0) console.log(`   … ${s.formId} eaten ${s.eaten} acc ${Math.round(s.accuracy * 100)}% users ${Math.round(s.run.users)} align ${Math.round(s.run.alignment)} trust ${Math.round(s.run.trust)} const ${Math.round(s.run.constitution)} event ${s.event} pending ${s.pending.length} counts ${JSON.stringify(s.counts)} losses ${JSON.stringify(s.losses)}`);
  if (s.finished) break;
}
const s = await page.evaluate(() => window.__emergence.state());
console.log('\nPer era (sim minutes):');
for (const f of s.run.log.forms) console.log(`  ${f.name.padEnd(28)} ${(f.seconds / 60).toFixed(1)}  diet ${Math.round(f.accuracy * 100)}%`);
console.log(`Bosses: ${(s.run.log.bosses ?? []).map((b) => `${b.title} ${b.won ? 'WON' : 'lost'}`).join(' · ')}`);
console.log(`Total sim: ${(s.run.log.playSeconds / 60).toFixed(1)} min · finished: ${s.finished} · stuck at: ${s.formId} (next ${s.next}) event ${s.event} pending ${s.pending}`);
if (errors.length) console.log('ERRORS', errors);
await browser.close();
await server.close();
process.exit(0);
