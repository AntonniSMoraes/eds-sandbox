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
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { authorBase, basicAuth, loadConfig, projectRoot } from './config.mjs';

const cfg = loadConfig();
const base = authorBase(cfg);
const auth = basicAuth(cfg);
const port = Number(cfg.FRANKLIN_PROXY_PORT);
const headHtmlPath = resolve(projectRoot, 'head.html');

const authorRoot = `http://localhost:${cfg.AEM_AUTHOR_PORT}`;
const resourcePrefix = `/content/${cfg.EDS_SITE}.resource/`;

function targetUrl(reqUrl) {
  const { pathname, search } = new URL(reqUrl, 'http://placeholder');

  // Assets do DAM e o proxy de código do author (.resource) moram na raiz do author.
  if (pathname.startsWith('/content/')) return `${authorRoot}${pathname}${search}`;

  let path = pathname;
  if (path.endsWith('/')) path += 'index';
  if (!extname(path)) path += '.html';
  return `${base}${path}${search}`;
}

/**
 * O author referencia o código como /content/{site}.resource/scripts/aem.js.
 * Reescrevendo para a raiz, quem serve é o aem up — ou seja, o seu working copy
 * com hot reload, que é o ponto do sandbox.
 */
function rewriteResourcePaths(html) {
  return html.split(resourcePrefix).join('/');
}

/**
 * Rede de segurança para quando o author devolver um documento sem as tags do EDS.
 * Só age em documentos completos: fragmentos (.plain.html do nav/footer) são
 * pedaços de markup e embrulhá-los num documento quebra o decorate.
 */
function injectHead(html) {
  if (cfg.INJECT_HEAD !== '1' || !existsSync(headHtmlPath)) return html;
  if (!html.includes('</head>')) return html;
  if (html.includes('/scripts/scripts.js')) return html;
  return html.replace('</head>', `${readFileSync(headHtmlPath, 'utf-8')}\n</head>`);
}

/**
 * O author busca estes arquivos como "code bus" (é a origem apontada pela
 * propriedade `url` da cloud config do site). Servimos direto do disco: sem isso
 * ele iria buscar em *.aem.page e o render estoura 500.
 */
const CODE_BUS_FILES = new Set([
  '/component-definition.json',
  '/component-models.json',
  '/component-filters.json',
  '/paths.json',
  '/xwalk.json',
  '/config.json',
  '/head.html',
]);
const CODE_BUS_DIRS = ['/blocks/', '/scripts/', '/styles/', '/icons/', '/fonts/'];

const CODE_TYPES = {
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
};

function serveFromDisk(pathname, res) {
  const rel = normalize(pathname).replace(/^\/+/, '');
  const file = join(projectRoot, rel);

  // /config.json é gerado pelo pipeline, não existe no repo. Sem resposta 200 o
  // author reconsulta em loop e enche o log de 404.
  if (pathname === '/config.json' && !existsSync(file)) {
    const body = Buffer.from('{}');
    res.writeHead(200, {
      'content-type': 'application/json',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
    return true;
  }
  if (!file.startsWith(projectRoot)) {
    res.writeHead(403).end();
    return true;
  }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    const body = readFileSync(file);
    res.writeHead(200, {
      'content-type': CODE_TYPES[extname(file)] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
    process.stdout.write(`200 ${pathname} (disco)\n`);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found\n');
    process.stdout.write(`404 ${pathname} (disco)\n`);
  }
  return true;
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://placeholder');
  if (CODE_BUS_FILES.has(pathname) || CODE_BUS_DIRS.some((d) => pathname.startsWith(d))) {
    serveFromDisk(pathname, res);
    return;
  }

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
      const body = injectHead(rewriteResourcePaths(Buffer.concat(chunks).toString('utf-8')));
      delete outHeaders['content-length'];
      delete outHeaders['content-encoding'];
      // O author responde chunked; como o corpo é reescrito e passa a ter
      // content-length, manter transfer-encoding faz o aem up rejeitar a resposta.
      delete outHeaders['transfer-encoding'];
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
