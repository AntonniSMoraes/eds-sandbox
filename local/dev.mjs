/**
 * Sobe o sandbox inteiro em um terminal só.
 *
 * O author é daemon (crx-quickstart/bin/start), então não ocupa terminal: só
 * esperamos ele responder. O resto roda como filho deste processo e morre junto
 * no Ctrl+C.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, projectRoot } from './config.mjs';

const cfg = loadConfig();
const authorUrl = `http://localhost:${cfg.AEM_AUTHOR_PORT}`;
const siteUrl = `https://localhost:${cfg.AEM_CLI_PORT}/`;
const auth = Buffer.from(`${cfg.AEM_AUTHOR_USER}:${cfg.AEM_AUTHOR_PASSWORD}`).toString('base64');

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
};
const ok = (m) => process.stdout.write(`  ${C.green}✓${C.reset} ${m}\n`);
const fail = (m) => process.stdout.write(`  ${C.red}✗${C.reset} ${m}\n`);
const step = (m) => process.stdout.write(`\n${C.bold}${m}${C.reset}\n`);

const children = [];
let shuttingDown = false;

function run(name, command, args, color) {
  const child = spawn(command, args, { cwd: projectRoot, env: process.env });
  children.push({ name, child });

  const prefix = `${color}${name.padEnd(8)}${C.reset}${C.dim}│${C.reset} `;
  const pipe = (stream) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.filter((l) => l.trim()).forEach((l) => process.stdout.write(`${prefix}${l}\n`));
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    fail(`${name} morreu (código ${code})`);
    shutdown(1);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write(`\n${C.dim}encerrando (o author continua no ar; pare com npm run local:author:stop)${C.reset}\n`);
  children.forEach(({ child }) => child.kill('SIGTERM'));
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function authorUp() {
  try {
    const res = await fetch(`${authorUrl}/libs/granite/core/content/login.html`, {
      headers: { authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sh(script, args = []) {
  return new Promise((done) => {
    const child = spawn('bash', [resolve(projectRoot, 'local', script), ...args], {
      cwd: projectRoot, stdio: 'inherit',
    });
    child.on('exit', done);
  });
}

step('1/3  author');
if (await authorUp()) {
  ok(`já no ar em ${authorUrl}`);
} else {
  await sh('author.sh');
  if (!await authorUp()) {
    fail('o author não subiu — veja crx-quickstart/logs/error.log');
    process.exit(1);
  }
}

step('2/3  configuração');
await sh('configure-site.sh');

step('3/3  serviços');
const ueBin = resolve(projectRoot, 'local/universal-editor-service/universal-editor-service.cjs');
const hasUe = existsSync(ueBin);
if (!hasUe) {
  process.stdout.write(`  ${C.yellow}!${C.reset} universal-editor-service.cjs ausente — o editor não vai conectar\n`);
  process.stdout.write(`    baixe em https://experience.adobe.com/downloads e ponha em local/universal-editor-service/\n`);
}

run('proxy', 'node', ['local/franklin-proxy.mjs'], '\x1b[36m');
run('tls', 'node', ['local/tls-proxy.mjs'], '\x1b[35m');
if (hasUe) run('editor', 'bash', ['local/ue.sh'], '\x1b[33m');
run('web', 'bash', ['local/web.sh'], '\x1b[32m');

setTimeout(() => {
  process.stdout.write(`
${C.bold}sandbox no ar${C.reset}

  site     ${siteUrl}
  author   ${authorUrl}  (${cfg.AEM_AUTHOR_USER}/${cfg.AEM_AUTHOR_PASSWORD})
  editor   https://experience.adobe.com/#/aem/editor
           ${C.dim}cole ${siteUrl} no campo "Site URL"${C.reset}

  ${C.dim}Ctrl+C encerra. O author fica de pé.${C.reset}

`);
}, 6000);
