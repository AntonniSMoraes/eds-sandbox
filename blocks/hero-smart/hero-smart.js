/*
 * Hero Smart — Webjump Smart Components
 *
 * As variantes NÃO passam por aqui: chegam como classe na div pela propriedade
 * `classes` do bloco, que o EDS transforma em atributo class sem JS nenhum.
 *
 * Este arquivo só dá semântica às linhas, na ordem dos campos do modelo, e
 * separa mídia de conteúdo para o grid ter sempre duas colunas — mesmo que o
 * autor deixe campos vazios. Os botões já chegam decorados pelo scripts.js
 * (link em negrito vira principal, itálico vira secundário).
 *
 * Campos com sufixo Alt/Text/Title/Type são absorvidos pelo campo base e não
 * geram linha, então a ordem aqui é: título, texto, imagem.
 */

const PAPEIS = ['titulo', 'texto', 'midia'];

function vazia(linha) {
  return !linha.textContent.trim() && !linha.querySelector('picture, img');
}

export default function decorate(block) {
  const linhas = [...block.children];

  linhas.forEach((linha, i) => {
    const papel = PAPEIS[i];
    if (!papel) return;
    linha.classList.add(`hero-smart-${papel}`);
    if (vazia(linha)) linha.classList.add('hero-smart-vazio');
  });

  const midia = block.querySelector('.hero-smart-midia');

  const conteudo = document.createElement('div');
  conteudo.className = 'hero-smart-conteudo';
  linhas.filter((linha) => linha !== midia).forEach((linha) => conteudo.append(linha));

  block.textContent = '';
  if (midia) block.append(midia);
  block.append(conteudo);
}
