export default async function decorate(block) {
  const links = [...block.querySelectorAll('a')];
  console.log("links: ", links);

  block.innerHTML = '';

  if (links.length === 0) {
    block.innerHTML = '<p>Selecione um ou mais cafés no painel.</p>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'coffee-cards-container';
  block.append(container);

  const fetchPromises = links.map(async (link) => {
    let fragmentPath = link.getAttribute('href');
    if (fragmentPath.endsWith('.html')) {
      fragmentPath = fragmentPath.replace(/\.html$/, '');
    }

    try {
      const response = await fetch(`${fragmentPath}.infinity.json`);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
      
      const data = await response.json();
      const cfData = data['jcr:content']?.data?.master;
      console.log("resposta: ", cfData);

      if (!cfData) return null;

      let nomeDoProdutor = 'Produtor desconhecido';
      if (cfData.produtorRef && typeof cfData.produtorRef === 'string') {
        try {
          const pathProdutor = cfData.produtorRef.replace(/\.html$/, '');
          const resProdutor = await fetch(`${pathProdutor}.infinity.json`);
          if (resProdutor.ok) {
             const dataProdutor = await resProdutor.json();
             const cfProdutor = dataProdutor['jcr:content']?.data?.master;
             if (cfProdutor && cfProdutor.nome) nomeDoProdutor = cfProdutor.nome;
          }
        } catch (e) {
          console.warn(`Erro no produtor do café ${cfData.nomeCafe}`);
        }
      }

      const card = document.createElement('div');
      card.className = 'coffee-card';
      
      card.innerHTML = `
        <img src="${cfData.fotoCafe}" alt="${cfData.nomeCafe}" style="max-width: 100%; border-radius: 8px;" />
        <h3>${cfData.nomeCafe}</h3>
        <p>${cfData.origemCafe}</p>
        <p><strong>Produtor:</strong> ${nomeDoProdutor}</p>
      `;

      return card;

    } catch (error) {
      console.error(`Erro ao carregar o fragmento: ${fragmentPath}`, error);
      return null;
    }
  });

  const cardsProntos = await Promise.all(fetchPromises);

  cardsProntos.forEach(card => {
    if (card) {
      container.append(card);
    }
  });
}