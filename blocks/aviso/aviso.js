/**
 * A ordem das linhas é a ordem dos campos em _aviso.json:
 * linha 0 = tipo (select), linha 1 = texto (richtext).
 */
export default function decorate(block) {
  const [tipoRow, textoRow] = [...block.children];
  const tipo = tipoRow?.textContent.trim() || 'info';

  block.classList.add(`aviso-${tipo}`);
  tipoRow?.remove();

  if (textoRow) {
    textoRow.classList.add('aviso-texto');
  }
}
