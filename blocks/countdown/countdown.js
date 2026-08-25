/*
 * Countdown de Campanha — Webjump Smart Components
 *
 * Variantes chegam como classe pela propriedade `classes` (sem JS).
 * Ordem das linhas = ordem dos campos: chamada, data alvo, mensagem de fim.
 *
 * Acessibilidade: os números mudam a cada segundo e seriam ruído em leitor de
 * tela, então ficam aria-hidden. Só o fim da campanha é anunciado, uma vez.
 */

const UNIDADES = [
  ['dias', 86400000],
  ['horas', 3600000],
  ['minutos', 60000],
  ['segundos', 1000],
];

function lerData(texto) {
  const bruto = texto.trim();
  if (!bruto) return null;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function montarUnidades(container) {
  return UNIDADES.map(([nome]) => {
    const unidade = document.createElement('div');
    unidade.className = 'countdown-unidade';
    const valor = document.createElement('span');
    valor.className = 'countdown-valor';
    valor.textContent = '--';
    const rotulo = document.createElement('span');
    rotulo.className = 'countdown-rotulo';
    rotulo.textContent = nome;
    unidade.append(valor, rotulo);
    container.append(unidade);
    return valor;
  });
}

export default function decorate(block) {
  const [linhaTitulo, linhaAlvo, linhaMensagem] = [...block.children];

  const alvo = lerData(linhaAlvo?.textContent || '');
  const titulo = linhaTitulo?.textContent.trim() || '';
  const mensagemFim = linhaMensagem?.textContent.trim() || '';

  block.textContent = '';

  // Sem data válida o bloco não tem o que contar. Não quebra a página:
  // some, e o autor vê o campo obrigatório vazio no editor.
  if (!alvo) {
    block.classList.add('countdown-sem-data');
    return;
  }

  if (titulo) {
    const chamada = document.createElement('p');
    chamada.className = 'countdown-chamada';
    chamada.textContent = titulo;
    block.append(chamada);
  }

  const relogio = document.createElement('time');
  relogio.className = 'countdown-relogio';
  relogio.dateTime = alvo.toISOString();
  relogio.setAttribute('aria-hidden', 'true');
  block.append(relogio);

  const aviso = document.createElement('p');
  aviso.className = 'countdown-fim';
  aviso.setAttribute('role', 'status');
  block.append(aviso);

  const valores = montarUnidades(relogio);
  let timer = null;

  const encerrar = () => {
    if (timer) clearInterval(timer);
    block.classList.add('countdown-encerrado');
    relogio.remove();
    aviso.textContent = mensagemFim;
  };

  const tique = () => {
    let restante = alvo.getTime() - Date.now();
    if (restante <= 0) {
      encerrar();
      return;
    }
    UNIDADES.forEach(([, ms], i) => {
      const quantidade = Math.floor(restante / ms);
      restante -= quantidade * ms;
      valores[i].textContent = String(quantidade).padStart(2, '0');
    });
  };

  tique();
  if (!block.classList.contains('countdown-encerrado')) {
    timer = setInterval(tique, 1000);
  }
}
