/**
 * Terminador TLS para o author, que só fala HTTP.
 * O Universal Editor roda em https://experience.adobe.com e o browser bloqueia
 * mixed content, então tudo que ele toca precisa de https.
 *
 *   https://localhost:{AEM_TLS_PORT} -> http://localhost:{AEM_AUTHOR_PORT}
 *
 * O UE service não entra aqui: ele serve HTTPS nativo (UES_CERT/UES_PRIVATE_KEY).
 */
import https from 'node:https';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { basicAuth, loadConfig, projectRoot } from './config.mjs';

const cfg = loadConfig();

/**
 * O Universal Editor manda x-aemconnection-authorization vazio contra um author
 * local: ele só sabe emitir token IMS para instâncias na nuvem. O serviço repassa
 * esse vazio para o AEM e leva 401.
 *
 * Como esta porta só existe para o sandbox e escuta em 127.0.0.1, injetamos a
 * credencial de admin aqui. É o que destrava a autoria local.
 */
const injectedAuth = basicAuth(cfg);
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
];

for (const route of routes) {
  const server = https.createServer(tls, (req, res) => {
    const headers = { ...req.headers, authorization: injectedAuth };
    const upstream = http.request(
      { host: '127.0.0.1', port: route.to, path: req.url, method: req.method, headers },
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
