/**
 * Reverse proxy que traduz o path "EDS" para o endpoint de entrega do author local.
 *
 *   GET /                    -> /bin/franklin.delivery/{org}/{site}/{branch}/index.html
 *   GET /produtos/foo        -> /bin/franklin.delivery/{org}/{site}/{branch}/produtos/foo.html
 *   GET /media_abc123.png    -> /bin/franklin.delivery/{org}/{site}/{branch}/media_abc123.png
 *
 * Existe porque o `aem up` monta a URL de origem com `new URL(path, proxyUrl)`,
 * o que descarta qualquer prefixo de path da URL passada em --url.
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { authorBase, basicAuth, loadConfig, projectRoot } from './config.mjs';

const cfg = loadConfig();
const base = authorBase(cfg);
const auth = basicAuth(cfg);
const port = Number(cfg.FRANKLIN_PROXY_PORT);
const headHtmlPath = resolve(projectRoot, 'head.html');

function targetUrl(reqUrl) {
  const { pathname, search } = new URL(reqUrl, 'http://placeholder');
  let path = pathname;
  if (path.endsWith('/')) path += 'index';
  if (!extname(path)) path += '.html';
  return `${base}${path}${search}`;
}

function injectHead(html) {
  if (cfg.INJECT_HEAD !== '1' || !existsSync(headHtmlPath)) return html;
  if (html.includes('/scripts/scripts.js')) return html;
  const head = readFileSync(headHtmlPath, 'utf-8');
  if (html.includes('</head>')) return html.replace('</head>', `${head}\n</head>`);
  return `<!DOCTYPE html><html><head>${head}</head><body>${html}</body></html>`;
}

const server = http.createServer((req, res) => {
  const url = targetUrl(req.url);
  const headers = { ...req.headers, authorization: auth, host: `localhost:${cfg.AEM_AUTHOR_PORT}` };
  delete headers.cookie;

  const upstream = http.request(url, { method: req.method, headers }, (up) => {
    const outHeaders = { ...up.headers };
    delete outHeaders['set-cookie'];
    delete outHeaders['content-security-policy'];
    delete outHeaders['x-frame-options'];

    const isHtml = (up.headers['content-type'] || '').includes('text/html');
    process.stdout.write(`${up.statusCode} ${req.method} ${req.url} -> ${url}\n`);

    if (!isHtml) {
      res.writeHead(up.statusCode, outHeaders);
      up.pipe(res);
      return;
    }

    const chunks = [];
    up.on('data', (c) => chunks.push(c));
    up.on('end', () => {
      const body = injectHead(Buffer.concat(chunks).toString('utf-8'));
      delete outHeaders['content-length'];
      delete outHeaders['content-encoding'];
      res.writeHead(up.statusCode, { ...outHeaders, 'content-length': Buffer.byteLength(body) });
      res.end(body);
    });
  });

  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`author local inacessivel (${url}): ${err.message}\n`);
  });

  req.pipe(upstream);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`franklin-proxy: http://localhost:${port} -> ${base}\n`);
});
