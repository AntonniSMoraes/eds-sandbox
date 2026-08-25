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
  AEM_TLS_PORT: '8443',
  AEM_CLI_PORT: '3000',
  DELIVERY_MODE: 'author',
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
        const value = line.slice(idx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        return [line.slice(0, idx).trim(), value];
      }),
  );
}

export function loadConfig() {
  return { ...DEFAULTS, ...parseEnvFile(resolve(projectRoot, '.env')), ...process.env };
}

/**
 * author   -> /content/{site}, render do author: markup EDS COM a instrumentação
 *             do Universal Editor (data-aue-* e as metas urn:adobe:aue:*).
 * pipeline -> /bin/franklin.delivery, exatamente o que o aem.live consumiria.
 *             Mesmo markup, mas SEM as metas do editor — serve para inspecionar
 *             o que iria para a entrega, não para autorar.
 */
export function authorBase(cfg) {
  const root = `http://localhost:${cfg.AEM_AUTHOR_PORT}`;
  return cfg.DELIVERY_MODE === 'pipeline'
    ? `${root}/bin/franklin.delivery/${cfg.EDS_ORG}/${cfg.EDS_SITE}/${cfg.EDS_BRANCH}`
    : `${root}/content/${cfg.EDS_SITE}`;
}

export function basicAuth(cfg) {
  return `Basic ${Buffer.from(`${cfg.AEM_AUTHOR_USER}:${cfg.AEM_AUTHOR_PASSWORD}`).toString('base64')}`;
}
