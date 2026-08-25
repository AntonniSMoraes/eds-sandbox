/*
 * Prova Social — Webjump Smart Components
 *
 * Bloco container: aceita dois tipos de item, logo e número, misturados na
 * mesma faixa. A primeira linha é a chamada do bloco; as demais são os itens.
 *
 * O tipo do item é detectado pelo CONTEÚDO (tem imagem = logo), não pelo
 * data-aue-model. Assim o bloco também funciona em autoria document-based,
 * onde esse atributo não existe.
 *
 * moveInstrumentation é obrigatório: reestruturamos linha em <li>, e sem ele o
 * Universal Editor perde a referência e o item deixa de ser editável.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const [linhaTitulo, ...itens] = [...block.children];
  const titulo = linhaTitulo?.textContent.trim() || '';

  const lista = document.createElement('ul');
  lista.className = 'prova-social-lista';

  itens.forEach((linha) => {
    const item = document.createElement('li');
    moveInstrumentation(linha, item);

    const imagem = linha.querySelector('picture');
    item.className = imagem ? 'prova-social-logo' : 'prova-social-numero';

    if (imagem) {
      const link = linha.querySelector('a[href]');
      const alvo = link || document.createElement('span');
      alvo.textContent = '';
      alvo.append(imagem);
      item.append(alvo);
    } else {
      const celulas = [...linha.children];
      const valor = document.createElement('span');
      valor.className = 'prova-social-valor';
      valor.textContent = celulas[0]?.textContent.trim() || '';
      const rotulo = document.createElement('span');
      rotulo.className = 'prova-social-rotulo';
      rotulo.textContent = celulas[1]?.textContent.trim() || '';
      item.append(valor, rotulo);
    }

    lista.append(item);
  });

  block.textContent = '';

  if (titulo) {
    const chamada = document.createElement('p');
    chamada.className = 'prova-social-chamada';
    chamada.textContent = titulo;
    block.append(chamada);
  }
  block.append(lista);

  block.querySelectorAll('picture > img').forEach((img) => {
    const otimizada = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    moveInstrumentation(img, otimizada.querySelector('img'));
    img.closest('picture').replaceWith(otimizada);
  });
}
