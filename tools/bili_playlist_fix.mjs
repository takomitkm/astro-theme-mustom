const flags = new Set(['--over', '--sleep']);
const arg = k => {
  const i = Deno.args.indexOf(k);
  return i >= 0 ? Deno.args[i + 1] : null;
};
const FILE = Deno.args.find((a, i) => !a.startsWith('--') && !flags.has(Deno.args[i - 1])) ||
  'source/data/bili-playlist.json';
const OVER = Number(arg('--over') ?? 0);
const SLEEP = Number(arg('--sleep') ?? 150);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0';

// 这三个码实测都会在嵌入播放器里加载它自带的 error.mp4（16.74 秒），
// 对访客等于放不出来，所以直接从歌单里剔除；其它非 0 码（-352/-412 一类
// 是风控而不是内容状态）保留并计数，连续太多就中止，避免大面积误删。
const DEAD = { '-404': '啥都木有', 62002: '稿件不可见', '-403': '访问权限不足' };

const view = async bvid => {
  const r = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, {
    headers: { 'user-agent': UA, 'referer': 'https://www.bilibili.com/' }
  });
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { retry: true });
  return await r.json();
};

const doc = JSON.parse(await Deno.readTextFile(FILE));
const targets = doc.items.map((x, i) => ({ ...x, i })).filter(x => x.duration > OVER);
console.log('file', FILE, 'items', doc.items.length, 'to check', targets.length, 'over', OVER);

const drop = [];
let fixed = 0, failed = 0;
for (const t of targets) {
  let j = null, retry = 0;
  while (retry < 3) {
    try {
      j = await view(t.bvid);
      break;
    } catch (e) {
      if (!e.retry) { j = { code: -1, message: e.message }; break; }
      retry++;
      await new Promise(r => setTimeout(r, 1000 * retry));
    }
  }
  if (!j) { console.log('FAIL', t.bvid, 'no response'); failed++; continue; }
  if (j.code === 0) {
    const pages = (j.data && j.data.pages) || [];
    const p = pages.find(x => x.page === (t.page || 1)) || pages[(t.page || 1) - 1] || pages[0];
    if (!p) {
      console.log('DROP', t.bvid, 'no playable page', '|', (t.title || '').slice(0, 24));
      drop.push(t.i);
    } else {
      if (p.duration !== t.duration) {
        console.log('FIX ', t.bvid, 'P' + p.page, t.duration, '->', p.duration,
          pages.length > 1 ? '(' + pages.length + 'P)' : '');
        doc.items[t.i].duration = p.duration;
        doc.items[t.i].page = p.page;
        fixed++;
      }
      if ((t.title || '').trim() !== (j.data.title || '').trim() && j.data.title) {
        doc.items[t.i].title = j.data.title;
      }
    }
  } else if (DEAD[j.code]) {
    console.log('DROP', t.bvid, 'code', j.code, DEAD[j.code], '|', (t.title || '').slice(0, 24));
    drop.push(t.i);
  } else {
    console.log('KEEP', t.bvid, 'code', j.code, j.message, '|', (t.title || '').slice(0, 24));
    failed++;
    if (failed > 20) { console.log('ABORT: too many unknown codes, likely rate limiting'); break; }
  }
  await new Promise(r => setTimeout(r, SLEEP));
}

const dropSet = new Set(drop);
doc.items = doc.items.filter((x, i) => !dropSet.has(i));
doc.count = doc.items.length;
doc.checked_at = new Date().toISOString();
await Deno.writeTextFile(FILE, JSON.stringify(doc, null, 1));
console.log('WROTE', FILE, 'kept', doc.items.length, 'dropped', drop.length, 'duration fixed', fixed, 'failed', failed);
