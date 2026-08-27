export default async function decorate(block) {
  // 1. Captura o caminho salvo pelo Universal Editor
  // Às vezes o AEM renderiza como link <a>, às vezes como texto puro
  const link = block.querySelector('a');
  const fragmentPath = link ? link.getAttribute('href') : block.textContent.trim();

  // Limpa o HTML genérico do bloco
  block.innerHTML = '';

  if (!fragmentPath) {
    block.innerHTML = '<p>☕ Selecione um fragmento de café no painel lateral.</p>';
    return;
  }

  try {
    // 2. Faz o fetch do fragmento adicionando .json ao final do caminho
    const response = await fetch(`${fragmentPath}.json`);
    
    if (!response.ok) {
      throw new Error('Falha ao buscar os dados do fragmento');
    }

    const data = await response.json();
    
    // Inspecione o painel do navegador para ver a estrutura exata!
    console.log('📦 Dados brutos do AEM:', data);

    // O AEM costuma envelopar os dados em um array dependendo da versão
    const cfData = data.data ? data.data[0] : data;

    // 3. Monta o HTML com os campos do seu modelo
    const card = document.createElement('div');
    card.className = 'coffee-card';
    
    // Nota: O AEM geralmente converte os nomes dos campos para minúsculas com hífen
    card.innerHTML = `
      <h3>${cfData['nome-do-cafe'] || cfData.nomeDoCafe || 'Nome não encontrado'}</h3>
      <p><strong>Origem:</strong> ${cfData['origem-do-cafe'] || cfData.origemDoCafe || 'N/A'}</p>
      <p><strong>Torra:</strong> ${cfData['nivel-de-torra'] || cfData.nivelDeTorra || 'N/A'}</p>
      <p class="notas">${cfData['notas-sensoriais-e-descricao'] || cfData.notasSensoriaisEDescricao || ''}</p>
    `;

    block.append(card);

  } catch (error) {
    console.error(error);
    block.innerHTML = '<p>❌ Erro ao carregar as informações do café.</p>';
  }
}