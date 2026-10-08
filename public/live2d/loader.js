const base = window.LIVE2D_BASE || '/live2d/';

await import(base + 'dist/waifu-tips.js');

const widget = {
  waifuPath: base + 'waifu-tips.json',
  cubism2Path: base + 'dist/live2d.min.js',
  tools: ['hitokoto', 'photo', 'info', 'quit'],
  drag: true,
  logLevel: 'warn'
};

window.initWidget(widget);

const tips = await (await fetch(widget.waifuPath)).json();
const one = t => Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : t;
const atHour = h => (tips.time || []).find(r => {
  const sp = String(r.hour).split('-');
  return Number(sp[0]) <= h && h <= Number(sp[1] || sp[0]);
});

let spoken = new Date().getHours();
const chime = () => {
  const h = new Date().getHours();
  if (h === spoken || !document.getElementById('waifu-tips') || typeof window.waifuShowTip !== 'function') return;
  const row = atHour(h);
  if (!row) return;
  spoken = h;
  const head = String(one(tips.message && tips.message.hourly) || '').split('{hour}').join(String(h));
  window.waifuShowTip(head + one(row.text), 6000, 11);
};

setInterval(chime, 30000);
