const base = window.LIVE2D_BASE || '/live2d/';

await import(base + 'dist/waifu-tips.js');

/*
 * waifu-tips.json 里的 models[].paths 是仓库里写死的站点绝对路径（/live2d/umaru/model.json），
 * 挂在子路径（GitHub Pages 的 /<仓库名>/）时会 404。第三方 runtime 只认这份 JSON，
 * 不接受从 widget 配置传模型路径，所以这里取回来改写前缀，再用 blob URL 喂给它。
 */
const tipsPath = base + 'waifu-tips.json';
let waifuPath = tipsPath;
try {
  const tips = await (await fetch(tipsPath)).json();
  if (Array.isArray(tips.models)) {
    tips.models.forEach((m) => {
      if (Array.isArray(m.paths)) {
        m.paths = m.paths.map((p) =>
          p.startsWith('/live2d/') ? base + p.slice('/live2d/'.length) : p,
        );
      }
    });
  }
  waifuPath = URL.createObjectURL(new Blob([JSON.stringify(tips)], { type: 'application/json' }));
} catch (e) {
  // 拿不到就退回原路径：至少 tips 的其余内容还能用
  console.warn('[live2d] 改写 models 路径失败，回退原始 waifu-tips.json', e);
}

const widget = {
  waifuPath,
  cubism2Path: base + 'dist/live2d.min.js',
  tools: ['hitokoto', 'photo', 'info', 'quit'],
  drag: true,
  logLevel: 'warn'
};

window.initWidget(widget);

const tips = await (await fetch(tipsPath)).json();
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
