// Gera a versão para hospedagem própria (Cloudflare Pages, Netlify, Vercel…):
//   dist-pages/index.html  +  dist-pages/media/<id>.<ext>
// No artifact do claude.ai os vídeos e fotos ficam em /_blob/<id>; fora dele esse
// caminho não existe, então aqui ele é trocado por media/<id>.<ext>.
//   npm run build:pages -- --media /caminho/da/pasta/com/os/arquivos
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Troca /_blob/<id> por media/<arquivo>, usando o mapa id → nome de arquivo. */
export function rewriteBlobs(html, files) {
  const missing = new Set();
  const out = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => {
    const f = files.get(id);
    if (!f) { missing.add(id); return m; }
    return 'media/' + f;
  });
  return { html: out, missing: [...missing] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--media');
  const mediaDir = i > 0 ? process.argv[i + 1] : join(ROOT, 'media');
  const files = new Map(readdirSync(mediaDir).filter((f) => /^[0-9a-f]{32}\.\w+$/.test(f)).map((f) => [f.slice(0, 32), f]));
  const { out } = build();
  const { html, missing } = rewriteBlobs(readFileSync(out, 'utf8'), files);
  if (missing.length) {
    console.error(`✖ ${missing.length} arquivo(s) faltando em ${mediaDir}:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  const dest = join(ROOT, 'dist-pages');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(dest, 'media'), { recursive: true });
  writeFileSync(join(dest, 'index.html'), html);
  const used = new Set([...html.matchAll(/media\/([0-9a-f]{32}\.\w+)/g)].map((m) => m[1]));
  used.forEach((f) => copyFileSync(join(mediaDir, f), join(dest, 'media', f)));
  // Cache longo para mídia (nomes não mudam) e curto para a página.
  writeFileSync(join(dest, '_headers'), '/media/*\n  Cache-Control: public, max-age=31536000, immutable\n/\n  Cache-Control: public, max-age=300\n');
  console.log(`✔ dist-pages/ pronto: index.html + ${used.size} arquivos de mídia`);
}
