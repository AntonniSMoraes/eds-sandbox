export default async function decorate(block) {
  const rows = [...block.children];

  if (rows.length === 0) {
    return;
  }

  block.classList.add('coffee-cards-container');

  const fetchPromises = rows.map(async (row) => {
    const link = row.querySelector('a');
    if (!link) return; 

    let fragmentPath = link.getAttribute('href');
    if (fragmentPath.endsWith('.html')) {
      fragmentPath = fragmentPath.replace(/\.html$/, '');
    }

    try {
      const response = await fetch(`${fragmentPath}.infinity.json`);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
      const data = await response.json();
      const cfData = data['jcr:content']?.data?.master;

      if (!cfData) return;

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

      row.className = 'coffee-card';
      row.innerHTML = `
        <img src="${cfData.fotoCafe}" alt="${cfData.nomeCafe}" style="max-width: 100%; border-radius: 8px;" />
        <div>
          <h3>${cfData.nomeCafe}</h3>
          <p>${cfData.origemCafe}</p>
          <p><strong>Produtor:</strong> ${nomeDoProdutor}</p>
        </div>
      `;

    } catch (error) {
      console.error(`Erro ao carregar o fragmento: ${fragmentPath}`, error);
    }
  });

  await Promise.all(fetchPromises);
}