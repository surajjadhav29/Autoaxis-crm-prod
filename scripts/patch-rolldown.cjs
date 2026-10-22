#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function patch() {
  const dir = path.join(process.cwd(), 'node_modules', 'rolldown', 'dist', 'shared');
  try {
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith('.mjs')) continue;
      const fp = path.join(dir, f);
      let txt = await fs.readFile(fp, 'utf8');
      const target = 'import { formatWithOptions, styleText } from "node:util";';
      if (txt.includes(target)) {
        const replacement = 'import { formatWithOptions } from "node:util";\nconst styleText = (s) => s;';
        txt = txt.replace(target, replacement);
        await fs.writeFile(fp, txt, 'utf8');
        console.log('Patched', fp);
      } else {
        console.log('No import to patch in', fp);
      }
    }
  } catch (e) {
    console.error('Patch failed:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

patch();
