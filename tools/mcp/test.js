// MCP v2.2 双源冒烟测试：握手 → 工具列表 → 双源搜索 → 读自家章节 → 读 vendor 条目（验署名）
'use strict';
const { spawn } = require('child_process');
const path = require('path');

const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
let done = 0;
srv.stdout.on('data', (d) => {
  buf += d.toString('utf8');
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { console.log('UNPARSED:', line.slice(0, 200)); continue; }
    if (msg.id === 1) console.log('[1] init ->', msg.result.serverInfo.name, 'v' + msg.result.serverInfo.version);
    if (msg.id === 2) console.log('[2] tools ->', msg.result.tools.map((t) => t.name).join(', '));
    if (msg.id === 3) {
      const p = JSON.parse(msg.result.content[0].text);
      console.log('[3] search "弹药 穿深" -> total=' + p.total, p.vendor_attribution ? '| HAS vendor attribution ✅' : '');
      (p.results || []).slice(0, 5).forEach((r) => console.log('    -', r.source, '|', r.section || r.title || r.entry, '| score', r.score));
    }
    if (msg.id === 4) {
      const p = JSON.parse(msg.result.content[0].text);
      if (p.error) console.log('[4] read_section -> ERROR:', p.error);
      else console.log('[4] read_section(自家) ->', p.volume, '|', p.section, '|', p.chars, '字');
    }
    if (msg.id === 5) {
      const p = JSON.parse(msg.result.content[0].text);
      if (p.error) console.log('[5] read_entry -> ERROR:', p.error);
      else {
        const hasAttr = p.body.includes('GTX950L/tarkov-encyclopedia') && p.body.includes('CC BY-NC-SA 4.0');
        console.log('[5] read_entry(ammo) ->', p.title, '|', p.chars, '字 | attribution tail:', hasAttr ? '✅' : '❌ MISSING');
      }
      done = 1;
      finish();
    }
  }
});

function finish() {
  console.log('--- v2.2 smoke done ---');
  srv.kill();
  process.exit(0);
}

const reqs = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '2.2' } } },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_wiki', arguments: { query: '弹药 穿深' } } },
  { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'read_section', arguments: { volume: '地图', section: '中转连接' } } },
  { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'read_entry', arguments: { entry: 'ammo' } } }
];

let i = 0;
const timer = setInterval(() => {
  if (i < reqs.length) {
    srv.stdin.write(JSON.stringify(reqs[i++]) + '\n');
  } else {
    clearInterval(timer);
  }
}, 400);

setTimeout(() => {
  if (!done) {
    console.log('TIMEOUT: smoke test did not complete in 15s');
    finish();
  }
}, 15000);
