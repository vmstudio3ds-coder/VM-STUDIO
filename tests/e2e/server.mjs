// Servidor estático mínimo para os testes E2E: entrega dist/vm-studio.html e
// responde /_blob/* (arquivos do artifact) com uma imagem 1×1.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../../dist/vm-studio.html', import.meta.url));
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export function serve(port = 0) {
  const html = readFileSync(SITE);
  const srv = createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (req.url.startsWith('/_blob/')) {
      res.writeHead(200, { 'content-type': 'image/png' });
      return res.end(PIXEL);
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() })));
}
