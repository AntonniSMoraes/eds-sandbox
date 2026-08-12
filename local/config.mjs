import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  AEM_SDK_DIR: '/Users/luizfrare/aem-sdk/crx-quickstart',
  AEM_AUTHOR_PORT: '4502',
  AEM_AUTHOR_USER: 'admin',
  AEM_AUTHOR_PASSWORD: 'admin',
  EDS_ORG: 'local',
  EDS_SITE: 'sandbox',
  EDS_BRANCH: 'main',
  FRANKLIN_PROXY_PORT: '4503',
  UES_PORT: '8000',
  UES_TLS_PORT: '8001',
  AEM_TLS_PORT: '8443',
  AEM_CLI_PORT: '3000',
  INJECT_HEAD: '1',
};

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

export function loadConfig() {
  return { ...DEFAULTS, ...parseEnvFile(resolve(projectRoot, '.env')), ...process.env };
}

export function authorBase(cfg) {
  return `http://localhost:${cfg.AEM_AUTHOR_PORT}/bin/franklin.delivery`
    + `/${cfg.EDS_ORG}/${cfg.EDS_SITE}/${cfg.EDS_BRANCH}`;
}

export function basicAuth(cfg) {
  return `Basic ${Buffer.from(`${cfg.AEM_AUTHOR_USER}:${cfg.AEM_AUTHOR_PASSWORD}`).toString('base64')}`;
}
