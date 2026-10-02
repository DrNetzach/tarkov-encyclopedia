#!/usr/bin/env node
/**
 * 打包脚本：把 docs\ 自家七卷 + 站点仓库 PVE 手册 + vendor\ GTX950L 条目
 * 解析成 data.json，供 Workers / SCF 版导入。
 * 切节规则与 ..\server.js 完全一致（同一套 h1/## 切节 + frontmatter 规则）。
 * data.json 含 vendor 内容，勿进 git（见根 .gitignore）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const DOCS = path.join(REPO, 'docs');
const GUIDE = path.resolve(REPO, '..', '站点仓库', 'docs'); // PVE 手册（ch01~ch13）
const VENDOR = path.join(REPO, 'vendor', 'GTX950L-tarkov-encyclopedia', 'content');

// ---------- 通用切节（h1 + ## 级），七卷与手册共用 ----------
function splitDoc(raw, file, kind) {
  const lines = raw.split(/\r?\n/);
  let h1 = file;
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
  return { file, h1, sections, kind };
}

// ---------- 源一a：自家七卷 ----------
function parseDocs() {
  const files = fs.readdirSync(DOCS).filter((f) => f.endsWith('.md'));
  return files.map((f) => splitDoc(fs.readFileSync(path.join(DOCS, f), 'utf8'), f, 'encyclopedia'));
}

// ---------- 源一b：自家 PVE 手册（递归收 ch01~ch13 + 首页） ----------
function collectMd(dir, rel) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...collectMd(p, rel ? rel + '/' + f : f));
    else if (f.endsWith('.md')) out.push({ p, rel: rel ? rel + '/' + f : f });
  }
  return out;
}

function parseGuide() {
  if (!fs.existsSync(GUIDE)) return [];
  return collectMd(GUIDE, '').map((x) => splitDoc(fs.readFileSync(x.p, 'utf8'), x.rel, 'guide'));
}

// ---------- 源二：GTX950L 条目（同 server.js loadVendor） ----------
function parseVendor() {
  const items = [];
  if (!fs.existsSync(VENDOR)) return items;
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
  return items;
}

const docs = parseDocs();
const guide = parseGuide();
const vendor = parseVendor();
const out = path.join(__dirname, 'data.json');
fs.writeFileSync(out, JSON.stringify({ docs: [...docs, ...guide], vendor }), 'utf8');
const mb = (fs.statSync(out).size / 1048576).toFixed(2);
console.log(`[build] encyclopedia=${docs.length}, guide=${guide.length}, vendor=${vendor.length} -> data.json ${mb} MB`);
