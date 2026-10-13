// Gera o site em um único arquivo (dist/vm-studio.html), pronto para publicar.
// O código-fonte fica em src/ como módulos ES; aqui os imports/exports são
// removidos e tudo é concatenado num <script> clássico, como o site original.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Ordem dos módulos no bundle: dependências primeiro. */
export const MODULES = [
  'data/galleries.js',
  'data/projects.js',
  'lib/math.js',
  'lib/format.js',
  'lib/acervo.js',
  'lib/film.js',
  'lib/layout.js',
  'app.js',
];

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/** Remove a sintaxe de módulo (imports e a palavra export) de um arquivo-fonte. */
export function stripModule(code) {
  return code
    .replace(/^import\s[^;]*?from\s*['"][^'"]+['"];[ \t]*\r?\n/gm, '')
    .replace(/^export\s+(?=(const|let|var|function|class)\b)/gm, '');
}

/** Troca cada "@inline:caminho" pelo data URI do arquivo em src/. */
export function inlineAssets(text, read = (p) => readFileSync(join(SRC, p))) {
  return text.replace(/@inline:([\w./-]+)/g, (_, p) => {
    const mime = MIME[extname(p).toLowerCase()];
    if (!mime) throw new Error(`Tipo de arquivo não suportado: ${p}`);
    return `data:${mime};base64,${read(p).toString('base64')}`;
  });
}

/** Junta os módulos em um script clássico. */
export function bundle(read = (p) => readFileSync(join(SRC, p), 'utf8')) {
  return MODULES.map((m) => stripModule(read(m))).join('');
}

export function build({ out = join(ROOT, 'dist', 'vm-studio.html') } = {}) {
  const tpl = readFileSync(join(SRC, 'index.html'), 'utf8');
  const css = readFileSync(join(SRC, 'styles.css'), 'utf8');
  const js = bundle();
  if (js.includes('</script')) throw new Error('O script não pode conter "</script".');
  const html = inlineAssets(tpl.replace('{{css}}', () => css).replace('{{js}}', () => js));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return { out, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { out, bytes } = build();
  console.log(`✔ ${out.replace(ROOT + '/', '')} (${(bytes / 1048576).toFixed(1)} MB)`);
}
