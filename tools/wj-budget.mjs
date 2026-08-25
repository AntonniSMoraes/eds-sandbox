/*
 * Orçamento de performance — Webjump Smart Components
 *
 * Cada bloco tem teto de CSS e de JS. Passou, o build quebra.
 * O EDS só tem um diferencial real, que é performance; sem um número que
 * falha no CI, o princípio vira intenção e o catálogo engorda em silêncio.
 *
 * Uso: npm run budget [-- --verbose]
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

const TETO = {
  bloco: { css: 4096, js: 4096 },
  global: { 'styles/wj-tokens.css': 4096, 'styles/wj-variants.css': 4096 },
};

/*
 * Blocos herdados do boilerplate que já nascem acima do teto. Continuam sendo
 * medidos e aparecem no relatório, mas não quebram o build — o orçamento existe
 * para governar o catálogo Webjump, não para brigar com código da Adobe.
 * Toda exceção precisa de motivo escrito. A lista não deve crescer.
 */
const EXCECOES = {
  header: 'navegação do boilerplate — menu, busca e responsividade num bloco só',
};

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m',
};
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const falhas = [];
const linhas = [];
const dispensados = [];

function conferir(rotulo, caminho, teto, excecao) {
  if (!existsSync(caminho)) return;
  const tamanho = statSync(caminho).size;
  const ok = tamanho <= teto;
  let marca = ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  if (!ok && excecao) {
    marca = `${C.yellow}!${C.reset}`;
    dispensados.push(`${rotulo} — ${kb(tamanho)} (exceção: ${excecao})`);
  } else if (!ok) {
    falhas.push(`${rotulo} — ${kb(tamanho)} excede o teto de ${kb(teto)}`);
  }
  linhas.push(`  ${marca} ${rotulo.padEnd(38)} ${kb(tamanho).padStart(8)} ${C.dim}/ ${kb(teto)}${C.reset}`);
}

const blocos = readdirSync(join(raiz, 'blocks'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

blocos.forEach((nome) => {
  const excecao = EXCECOES[nome];
  conferir(`blocks/${nome}/${nome}.css`, join(raiz, 'blocks', nome, `${nome}.css`), TETO.bloco.css, excecao);
  conferir(`blocks/${nome}/${nome}.js`, join(raiz, 'blocks', nome, `${nome}.js`), TETO.bloco.js, excecao);
});

Object.entries(TETO.global).forEach(([rel, teto]) => {
  conferir(rel, join(raiz, rel), teto);
});

if (verbose || falhas.length) process.stdout.write(`${linhas.join('\n')}\n`);

if (falhas.length) {
  process.stdout.write(`\n${C.red}orçamento estourado:${C.reset}\n`);
  falhas.forEach((f) => process.stdout.write(`  - ${f}\n`));
  process.stdout.write('\nDivida o bloco, mova estilo repetido para tokens, ou reveja o teto conscientemente.\n');
  process.exit(1);
}

if (dispensados.length) {
  process.stdout.write(`${C.yellow}!${C.reset} fora do teto por exceção declarada:\n`);
  dispensados.forEach((d) => process.stdout.write(`  - ${d}\n`));
}

process.stdout.write(`${C.green}✓${C.reset} orçamento ok — ${blocos.length} blocos medidos\n`);
