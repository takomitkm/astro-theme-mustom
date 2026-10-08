const MEDIA_ID = process.argv[2] || (console.error('用法: deno run -A tools/bili_fav_dump.mjs <media_id> [输出文件]'), process.exit(2));
const OUT = process.argv[3] || 'source/data/bili-playlist.json';
const PS = 20;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0';

const grab = async (pn) => {
  const u = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${MEDIA_ID}&pn=${pn}&ps=${PS}&order=mtime&type=0&tid=0&platform=web`;
  const r = await fetch(u, { headers: { 'user-agent': UA, 'referer': 'https://www.bilibili.com/' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' pn=' + pn);
  const j = await r.json();
  if (j.code !== 0) throw new Error('code ' + j.code + ' pn=' + pn);
  return j.data;
};

let pn = 1, hasMore = true, items = [], info = null;
while (hasMore) {
  const d = await grab(pn);
  info = info || d.info;
  for (const m of d.medias || []) {
    if (!m || !m.bvid) continue;
    items.push({
      bvid: m.bvid,
      title: m.title,
      duration: m.duration,
      page: m.page || 1,
      upper: m.upper ? m.upper.name : '',
      pubtime: m.pubtime || 0
    });
  }
  hasMore = !!d.has_more;
  console.log('page', pn, 'total', items.length, 'has_more', hasMore);
  pn++;
  if (pn > 80) break;
  await new Promise(r => setTimeout(r, 400));
}

items.sort((a, b) => b.pubtime - a.pubtime);
const body = JSON.stringify({
  media_id: Number(MEDIA_ID),
  title: info ? info.title : '',
  collected: info ? info.upper ? info.upper.name : '' : '',
  count: items.length,
  fetched_at: new Date().toISOString(),
  items
}, null, 1);

const { writeTextFile } = Deno;
await writeTextFile(OUT, body);
console.log('WROTE', OUT, items.length, 'items', body.length, 'bytes');
