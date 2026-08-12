/**
 * Terminador TLS para os serviços que só falam HTTP.
 * O Universal Editor roda em https://experience.adobe.com e o browser bloqueia
 * mixed content, então tanto o author quanto o UE service precisam de https.
 *
 *   https://localhost:{AEM_TLS_PORT}  -> http://localhost:{AEM_AUTHOR_PORT}
 *   https://localhost:{UES_TLS_PORT}  -> http://localhost:{UES_PORT}
 */
import https from 'node:https';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, projectRoot } from './config.mjs';

const cfg = loadConfig();
const certDir = resolve(projectRoot, 'local/certs');
const cert = resolve(certDir, 'localhost.pem');
const key = resolve(certDir, 'localhost-key.pem');

if (!existsSync(cert) || !existsSync(key)) {
  process.stderr.write('certificados ausentes: rode `npm run local:certs`\n');
  process.exit(1);
}

const tls = { cert: readFileSync(cert), key: readFileSync(key) };

const routes = [
  { from: Number(cfg.AEM_TLS_PORT), to: Number(cfg.AEM_AUTHOR_PORT), name: 'aem-author' },
  { from: Number(cfg.UES_TLS_PORT), to: Number(cfg.UES_PORT), name: 'universal-editor-service' },
];

for (const route of routes) {
  const server = https.createServer(tls, (req, res) => {
    const upstream = http.request(
      { host: '127.0.0.1', port: route.to, path: req.url, method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      },
    );
    upstream.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`${route.name} inacessivel na porta ${route.to}: ${err.message}\n`);
    });
    req.pipe(upstream);
  });

  server.on('upgrade', (req, socket, head) => {
    const upstream = http.request({
      host: '127.0.0.1', port: route.to, path: req.url, method: req.method, headers: req.headers,
    });
    upstream.on('upgrade', (upRes, upSocket, upHead) => {
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(upRes.headers)
        .map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
      if (upHead?.length) socket.unshift(upHead);
      upSocket.pipe(socket).pipe(upSocket);
    });
    upstream.on('error', () => socket.destroy());
    if (head?.length) upstream.write(head);
    upstream.end();
  });

  server.listen(route.from, '127.0.0.1', () => {
    process.stdout.write(`tls-proxy: https://localhost:${route.from} -> http://localhost:${route.to} (${route.name})\n`);
  });
}
