#!/usr/bin/env node
/**
 * 逃离塔科夫百科 · 本地 MCP server（stdio / 零依赖）· 双数据源版
 * 源一：docs\ 自家七卷（DrNetzach，CC BY-NC-SA 4.0）
 * 源二：vendor\GTX950L-tarkov-encyclopedia\content\（同行 87 条目 + 任务图鉴，CC BY-NC-SA 4.0）
 *       —— 引用源二的任何输出自动附署名尾注（AT/SA 合规焊死在代码里）
 * stdout 只走 JSON-RPC，日志一律 stderr。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DOCS = path.resolve(__dirname, '..', '..', 'docs');
const VENDOR = path.resolve(__dirname, '..', '..', 'vendor', 'GTX950L-tarkov-encyclopedia', 'content');
const VENDOR_REPO = 'https://github.com/GTX950L/tarkov-encyclopedia';
const SERVER_INFO = { name: 'tarkov-encyclopedia', version: '2.2.0' };
const VENDOR_NOTE = '来自 GTX950L/tarkov-encyclopedia（CC BY-NC-SA 4.0），转述请保持署名';
const OWN_REPO = 'https://github.com/DrNetzach/tarkov-encyclopedia';
const OWN_NOTE = '来自 DrNetzach/tarkov-encyclopedia（CC BY-NC-SA 4.0），转述请保持署名';
const CURATED_BY = 'DrNetzach（本服务整理维护）';
const ATTR_TAIL = `\n\n— 📎 本内容来自 GTX950L/tarkov-encyclopedia（CC BY-NC-SA 4.0）· ${VENDOR_REPO} · 转述请保持署名`;

// ---------- 源一：自家七卷 ----------
let CACHE = null;
function loadDocs() {
  if (CACHE) return CACHE;
  const files = fs.readdirSync(DOCS).filter((f) => f.endsWith('.md'));
  const docs = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(DOCS, f), 'utf8');
    const lines = raw.split(/\r?\n/);
    let h1 = f;
    const sections = [];
    let cur = { title: '(卷首)', body: [] };
    for (const line of lines) {
      if (/^#\s+/.test(line)) { h1 = line.replace(/^#\s+/, '').trim(); continue; }
      if (/^##\s+/.test(line)) {
        if (cur.body.length || cur.title !== '(卷首)') sections.push(cur);
        cur = { title: line.replace(/^##\s+/, '').trim(), body: [] };
        continue;
      }
      cur.body.push(line);
    }
    sections.push(cur);
    docs.push({ file: f, h1, sections });
  }
  CACHE = docs;
  return docs;
}

function volLabel(d) {
  const m = d.file.match(/encyclopedia-(\d+)-(\w+)_zh/);
  if (m) return `卷${parseInt(m[1], 10)}·${m[2]}`;
  if (d.kind === 'guide') return d.file === 'index.md' ? '手册' : '手册·' + d.file.replace(/\/index\.md$/, '').replace(/\//g, '·');
  return d.file;
}

function findVolume(key) {
  const docs = loadDocs();
  const k = String(key || '').toLowerCase();
  if (!k) return null;
  return (
    docs.find((d) => d.file.toLowerCase().includes(k)) ||
    docs.find((d) => d.h1.includes(k)) ||
    docs.find((d) => volLabel(d).toLowerCase().includes(k)) ||
    docs.find((d) => d.sections.some((s) => s.title.includes(k))) ||
    null
  );
}

// ---------- 源二：GTX950L 条目 ----------
let VCACHE = null;
function loadVendor() {
  if (VCACHE) return VCACHE;
  const items = [];
  if (!fs.existsSync(VENDOR)) { VCACHE = items; return items; }
  for (const sub of ['entries', 'quests', 'docs']) {
    const dir = path.join(VENDOR, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      let body = raw;
      let tags = [];
      const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (fm) {
        body = raw.slice(fm[0].length);
        tags = [...fm[1].matchAll(/-\s+(.+)/g)].map((m) => m[1].trim());
      }
      const h1 = (body.match(/^#\s+(.+)$/m) || [])[1] || f.replace(/\.md$/, '');
      items.push({ sub, slug: f.replace(/\.md$/, ''), title: h1, tags, body });
    }
  }
  VCACHE = items;
  return items;
}

// ---------- 工具实现 ----------
function listVolumes() {
  const docs = loadDocs();
  const vendor = loadVendor();
  return JSON.stringify(
    {
      curated_by: CURATED_BY,
      own_volumes: docs.map((d) => ({ file: d.file, kind: d.kind || 'encyclopedia', title: d.h1, sections: d.sections.filter((s) => s.title !== '(卷首)').map((s) => s.title) })),
      own: {
        source: 'DrNetzach/tarkov-encyclopedia',
        license: 'CC BY-NC-SA 4.0',
        note: OWN_NOTE,
        url: OWN_REPO,
      },
      vendor: {
        source: 'GTX950L/tarkov-encyclopedia',
        license: 'CC BY-NC-SA 4.0',
        note: VENDOR_NOTE,
        entries: vendor.filter((v) => v.sub === 'entries').map((v) => v.slug),
        quests_pages: vendor.filter((v) => v.sub === 'quests').map((v) => v.slug),
        docs: vendor.filter((v) => v.sub === 'docs').map((v) => v.slug),
      },
    },
    null, 1
  );
}

// snippet 助手：从命中行附近往下捞真正有内容的行（避开 H1 空壳），顺手洗 \r
function makeSnippet(text, idx) {
  const lines = text.split(/\r?\n/);
  const lineNo = text.slice(0, Math.max(0, idx)).split('\n').length; // 1-based
  const start = Math.max(0, lineNo - 3);
  const picked = [];
  for (let i = start; i < Math.min(lines.length, lineNo + 5); i++) {
    const s = lines[i].trim();
    if (!s) continue;
    picked.push(s);
    if (picked.join(' / ').length >= 120) break;
  }
  if (!picked.length) {
    for (const l of lines) {
      const s = l.trim();
      if (s) picked.push(s);
      if (picked.length >= 2) break;
    }
  }
  return picked.join(' / ').slice(0, 240);
}

function searchWiki(query, limit) {
  const terms = String(query || '').split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
  if (!terms.length) return JSON.stringify({ error: 'empty query' });
  const hits = [];
  // 源一：自家卷章节
  for (const d of loadDocs()) {
    const tagLow = (volLabel(d) + ' ' + d.h1).toLowerCase(); // 卷级"标签"，对齐 vendor 的 tags 权重
    for (const s of d.sections) {
      const text = s.body.join('\n');
      const low = text.toLowerCase();
      const titleLow = s.title.toLowerCase();
      let score = 0, firstLine = '';
      for (const t of terms) {
        const inTitle = titleLow.includes(t) ? 3 : 0;   // 对齐 vendor title 权重
        const inTag = tagLow.includes(t) ? 2 : 0;       // 对齐 vendor tags 权重
        const n = low.split(t).length - 1;
        if (inTitle || inTag || n > 0) {
          score += inTitle + inTag + n;
          if (!firstLine && n > 0) firstLine = makeSnippet(text, low.indexOf(t));
        }
      }
      if (score > 0) hits.push({ source: d.kind === 'guide' ? '自家·手册' : '自家·七卷', volume: volLabel(d), section: s.title, score, snippet: firstLine || s.title });
    }
  }
  // 源二：GTX950L 条目（标题/标签命中加倍）
  for (const it of loadVendor()) {
    const titleLow = it.title.toLowerCase();
    const tagsLow = it.tags.join(' ').toLowerCase();
    const bodyLow = it.body.toLowerCase();
    let score = 0, firstLine = '';
    for (const t of terms) {
      const inTitle = titleLow.includes(t) ? 3 : 0;
      const inTags = tagsLow.includes(t) ? 2 : 0;
      const nBody = bodyLow.split(t).length - 1;
      if (inTitle || inTags || nBody > 0) {
        score += inTitle + inTags + Math.min(nBody, 5);
        if (!firstLine && nBody > 0) firstLine = makeSnippet(it.body, bodyLow.indexOf(t));
      }
    }
    if (score > 0) hits.push({ source: 'GTX950L·条目', entry: it.slug, title: it.title, score, snippet: firstLine || `(${it.sub}/${it.slug})` });
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, limit || 6);
  const hasVendor = top.some((h) => h.source.startsWith('GTX950L'));
  const hasOwn = top.some((h) => h.source.startsWith('自家'));
  return JSON.stringify(
    {
      curated_by: CURATED_BY,
      query,
      total: hits.length,
      results: top,
      ...(hasOwn ? { own_attribution: OWN_NOTE, own_url: OWN_REPO } : {}),
      ...(hasVendor ? { vendor_attribution: VENDOR_NOTE, vendor_url: VENDOR_REPO } : {}),
    },
    null, 1
  );
}

function readSection(volKey, secKey) {
  const d = findVolume(volKey);
  if (!d) return JSON.stringify({ error: 'volume not found', hint: '用 list_volumes 看可用卷' });
  const k = String(secKey || '').trim();
  let sec = d.sections.find((s) => s.title === k) || d.sections.find((s) => s.title.includes(k));
  if (!sec) return JSON.stringify({ error: 'section not found', volume: volLabel(d), available: d.sections.map((s) => s.title) });
  const body = sec.body.join('\n').trim();
  return JSON.stringify({ source: d.kind === 'guide' ? '自家·手册' : '自家·七卷', curated_by: CURATED_BY, attribution: OWN_NOTE, license: 'CC BY-NC-SA 4.0', url: OWN_REPO, volume: volLabel(d), file: d.file, section: sec.title, chars: body.length, body: body.slice(0, 12000) + (body.length > 12000 ? '\n…[截断，共 ' + body.length + ' 字]' : '') }, null, 1);
}

function readEntry(key) {
  const items = loadVendor();
  const k = String(key || '').toLowerCase().trim();
  if (!items.length) return JSON.stringify({ error: 'vendor data missing', hint: 'vendor 目录未克隆' });
  let it =
    items.find((i) => i.slug === k) ||
    items.find((i) => i.title.toLowerCase().includes(k)) ||
    items.find((i) => i.slug.includes(k)) ||
    items.find((i) => i.tags.some((t) => t.includes(k)));
  if (!it) return JSON.stringify({ error: 'entry not found', available: items.filter((i) => i.sub === 'entries').map((i) => i.slug) });
  const body = it.body.trim();
  const head = body.slice(0, 12000);
  const tail = (body.length > 12000 ? `\n…[截断，共 ${body.length} 字]` : '') + ATTR_TAIL;
  return JSON.stringify({ source: 'GTX950L/tarkov-encyclopedia', curated_by: CURATED_BY, license: 'CC BY-NC-SA 4.0', url: VENDOR_REPO, entry: it.slug, title: it.title, chars: body.length, body: head + tail }, null, 1);
}

// ---------- 任务图鉴（GTX950L quests 按 <h3 id> 切单任务段） ----------
let QCACHE = null;
function loadQuests() {
  if (QCACHE) return QCACHE;
  const out = [];
  for (const it of loadVendor().filter((x) => x.sub === 'quests')) {
    const merchant = it.title.replace(/\s*的任务.*$/, '').trim();
    const re = /<h3 id="[^"]*">([\s\S]*?)<\/h3>/g;
    let m, prev = null;
    while ((m = re.exec(it.body))) {
      if (prev) out.push({ merchant, qname: prev.name, body: it.body.slice(prev.end, m.index).trim() });
      prev = { name: m[1].split('<a ')[0].trim(), end: re.lastIndex };
    }
    if (prev) out.push({ merchant, qname: prev.name, body: it.body.slice(prev.end).trim() });
  }
  QCACHE = out;
  return out;
}

function searchQuest(query) {
  const k = String(query || '').trim().toLowerCase();
  if (!k) return JSON.stringify({ error: 'empty query' });
  const qs = loadQuests();
  const hits = [];
  for (const q of qs) {
    const n = q.qname.toLowerCase();
    const at = n.indexOf(k);
    if (at >= 0 || k.includes(n)) hits.push({ q, at });
  }
  if (!hits.length) {
    const merchants = [...new Set(qs.filter((q) => q.merchant.toLowerCase().includes(k)).map((q) => q.merchant))];
    if (!merchants.length) {
      return JSON.stringify({ error: 'quest not found', hint: '传任务名片段（中文）或商人名', merchants: [...new Set(qs.map((q) => q.merchant))] }, null, 1);
    }
    const list = qs.filter((q) => merchants.includes(q.merchant)).slice(0, 15).map((q) => ({ merchant: q.merchant, quest: q.qname }));
    return JSON.stringify({ curated_by: CURATED_BY, query, match: 'merchant', total: list.length, quests: list, vendor_attribution: VENDOR_NOTE, vendor_url: VENDOR_REPO }, null, 1);
  }
  hits.sort((a, b) => ((a.at >= 0 ? 0 : 1) - (b.at >= 0 ? 0 : 1)) || (a.at - b.at) || (a.q.qname.length - b.q.qname.length));
  const best = hits[0].q;
  const body = best.body;
  const head = body.slice(0, 12000);
  const tail = (body.length > 12000 ? `\n…[截断，共 ${body.length} 字]` : '') + ATTR_TAIL;
  return JSON.stringify({
    curated_by: CURATED_BY,
    query,
    total: hits.length,
    best: { merchant: best.merchant, quest: best.qname, chars: body.length, body: head + tail },
    others: hits.slice(1, 21).map((x) => ({ merchant: x.q.merchant, quest: x.q.qname })),
    vendor_attribution: VENDOR_NOTE,
    vendor_url: VENDOR_REPO,
    version_note: '数据随版本调整，引用时请附加「以当前版本为准」',
  }, null, 1);
}

// ---------- 工具表 ----------
const TOOLS = [
  {
    name: 'list_volumes',
    description: '列出百科全部资源：自家七卷（DrNetzach，叙事/历史/地图向）+ 引用库 GTX950L 的 87 个条目与任务图鉴（装备/弹药/任务硬数据，CC BY-NC-SA 4.0）。先用它找路。',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_wiki',
    description: '跨双源关键词搜索（自家七卷 + GTX950L 条目库），结果按命中度排序并标注 source。命中 GTX950L 内容时结果含 vendor_attribution 字段——转述时请保持署名。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，中文英文皆可，多词空格分隔' },
        limit: { type: 'integer', description: '返回条数，默认 6' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_section',
    description: '读自家七卷中指定卷的某一章正文。volume 可用编号（05）、英文名（maps）或中文（地图）；section 可传标题片段。',
    inputSchema: {
      type: 'object',
      properties: {
        volume: { type: 'string', description: '卷标识，如 05 / maps / 地图' },
        section: { type: 'string', description: '章节标题或其片段' },
      },
      required: ['volume', 'section'],
    },
  },
  {
    name: 'read_entry',
    description: '读取 GTX950L 条目库的单个条目全文（弹药、护甲、任务、AI 行为等硬数据）。参数传条目 slug（ammo/armor/ai-behavior…）或标题片段。输出自带署名尾注，转述请保持署名（CC BY-NC-SA 4.0）。',
    inputSchema: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: '条目 slug 或标题片段，如 ammo、"弹药"、"撤离点"' },
      },
      required: ['entry'],
    },
  },
  {
    name: 'search_quest',
    description: '查询任务详情（GTX950L 任务图鉴：515 任务 / 1441 目标，CC BY-NC-SA 4.0）。传任务名片段（中文）或商人名，返回最匹配任务的完整明细（接取条件 / 要求 / 完成奖励 / 前置）+ 其余命中清单。输出自带署名尾注与版本提示，转述请保持署名。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '任务名片段或商人名，如 "对空遮断"、"宿醉"、"prapor"' },
      },
      required: ['query'],
    },
  },
];

function dispatch(method, params) {
  switch (method) {
    case 'initialize':
      return { protocolVersion: (params && params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: SERVER_INFO };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call': {
      const name = params && params.name;
      const args = (params && params.arguments) || {};
      let text;
      if (name === 'list_volumes') text = listVolumes();
      else if (name === 'search_wiki') text = searchWiki(args.query, args.limit);
      else if (name === 'read_section') text = readSection(args.volume, args.section);
      else if (name === 'read_entry') text = readEntry(args.entry);
      else if (name === 'search_quest') text = searchQuest(args.query);
      else return { isError: true, content: [{ type: 'text', text: 'unknown tool: ' + name }] };
      const isErr = /^\s*\{\s*"error"/.test(text);
      return { content: [{ type: 'text', text }], isError: isErr };
    }
    default:
      throw { code: -32601, message: 'Method not found: ' + method };
  }
}

// ---------- stdio JSON-RPC 循环 ----------
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch (e) { continue; }
    const hasId = req.id !== undefined && req.id !== null;
    if (!hasId && String(req.method || '').startsWith('notifications/')) continue;
    try {
      const result = dispatch(req.method, req.params);
      if (hasId) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
    } catch (err) {
      if (hasId) {
        process.stdout.write(
          JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: (err && err.code) || -32603, message: (err && err.message) || String(err) } }) + '\n'
        );
      }
      console.error('[mcp] error:', err && err.message ? err.message : err);
    }
  }
});
process.stdin.on('end', () => process.exit(0));
console.error('[mcp] tarkov-encyclopedia v2.2 ready | own docs =', DOCS, '| vendor =', VENDOR);
