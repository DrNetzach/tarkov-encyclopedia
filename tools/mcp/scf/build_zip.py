# -*- coding: utf-8 -*-
# 打腾讯云 SCF HTTP 函数包：scf_bootstrap(LF+0755) + index.js + data.json
# 数据复用 ..\cloudflare\data.json（由 ..\cloudflare\build.js 生成），zip 输出到 %TEMP%。
import zipfile, sys, os, shutil

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'cloudflare', 'data.json')
OUT = os.path.join(os.environ.get('TEMP', '/tmp'), 'scf_mcp.zip')

if not os.path.exists(DATA):
    sys.exit('data.json missing - run ..\\cloudflare\\build.js first')

bootstrap = b"#!/bin/bash\nexec node index.js\n"


def add(z, name, data, mode):
    zi = zipfile.ZipInfo(name)
    zi.external_attr = (mode << 16) | 0o2000000
    zi.create_system = 3  # Unix
    z.writestr(zi, data)


with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    add(z, 'scf_bootstrap', bootstrap, 0o100755)
    add(z, 'index.js', open(os.path.join(HERE, 'index.js'), 'rb').read(), 0o100644)
    add(z, 'data.json', open(DATA, 'rb').read(), 0o100644)

print('built', OUT, os.path.getsize(OUT), 'bytes')
with zipfile.ZipFile(OUT) as z:
    for i in z.infolist():
        print('  ', i.filename, i.file_size, oct((i.external_attr >> 16) & 0o777))
