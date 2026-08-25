# Webjump Smart Components para AEM Edge Delivery Services
## Fase 1 — Levantamento

Documento base. Sem código, sem decisão fechada: mapeia demanda, mapeia por que
empresas abandonam a Adobe, e propõe a arquitetura que responde aos dois.

Data: agosto/2026.

---

## 1. A tese

Quem compra AEM compra promessa de escala. Quem *usa* AEM sofre com velocidade.
O gargalo raramente é a plataforma — é o fato de que **toda página nova passa pelo
time de desenvolvimento**. É exatamente esse gargalo que Webflow, Builder.io,
Contentstack e Storyblok atacam na venda, e é por ele que empresas saem.

O Edge Delivery Services resolve metade do problema (entrega e performance) e
*piora* a outra metade no começo: o modelo de blocos é enxuto de propósito, então
todo projeto começa do zero, e cada seção nova de landing page vira ticket de dev.

**Webjump Smart Components é a camada que falta**: uma biblioteca de blocos EDS
que dá ao editor liberdade criativa real dentro de trilhos que o desenvolvedor
definiu uma vez. O editor monta a página; o dev não é chamado.

O risco a evitar está do outro lado: liberdade demais vira entropia de design e
mata a performance — que é o único ativo que o EDS tem de diferencial. A tese
central deste documento é que **liberdade por intenção**, não por controle atômico
de CSS, resolve os dois lados.

---

## 2. O que os grandes clientes realmente pedem

### 2.1 Seções de landing page

Ranqueadas por frequência de pedido em projetos enterprise. As marcadas com ⚠️
não existem no Block Collection oficial da Adobe — ou seja, hoje são código sob
medida em todo projeto.

| Seção | Uso | Existe no EDS oficial? |
|---|---|---|
| Hero (imagem/vídeo/split, com CTA) | Toda LP | Parcial — hero básico |
| Prova social (logos, contadores, selos G2) | Quase toda LP B2B | ⚠️ Não |
| Depoimento / caso com métrica | Alta | Quote (fraco para isso) |
| Cards de benefício / features | Toda LP | Cards |
| Tabela de preços / planos | Alta em SaaS e serviços | ⚠️ Não |
| Comparativo (nós × concorrente, plano × plano) | Média-alta | ⚠️ Não |
| FAQ | Toda LP | Accordion |
| Formulário de captura + integração | Toda LP de campanha | ⚠️ Form deprecado |
| CTA fixo / sticky bar | Alta | ⚠️ Não |
| Bento grid | Crescente em 2026 | ⚠️ Não |
| Timeline / passo a passo | Média | ⚠️ Não |
| Estatísticas em destaque | Média-alta | ⚠️ Não |
| Galeria / carrossel | Média | Carousel |
| Vídeo com poster e lazy | Alta | Video |
| Modal / cupom / saída | Média | Modal |
| Mapa / lojas / cobertura | Média (varejo) | ⚠️ Não |
| Tabs de conteúdo | Média | Tabs |
| Countdown de campanha | Sazonal, alta em varejo | ⚠️ Não |

O padrão é claro: **o que o EDS entrega pronto cobre estrutura de conteúdo
genérica; o que vende campanha não existe**. E a documentação da Adobe é explícita
sobre isso — o valor do Block Collection "é a estrutura de conteúdo que ele
fornece", com a expectativa de que cada projeto adapte CSS e JS por conta própria.
Não é lacuna acidental, é escopo deliberado. É aí que um acelerador tem espaço.

### 2.2 Demandas de customização e operacional

Menos glamourosas que as seções, mas são elas que decidem renovação de contrato:

- **Identidade visual por marca/região** — mesma base de código servindo N marcas
- **Troca de tema sem deploy** — campanha sazonal muda paleta e tipografia
- **Variações de seção** — a mesma prova social em 4 aparências
- **Espaçamento e ritmo vertical** controlados pelo editor sem quebrar o design
- **Criação de LP por clonagem** — duplicar campanha e trocar copy/imagem
- **A/B testing e personalização** sem depender de deploy
- **Formulários** com validação, consentimento LGPD e integração a CRM/Marketo
- **Consent/cookies** e o impacto disso em performance
- **Analytics e tagueamento** consistentes por componente, sem código por página
- **Acessibilidade** — WCAG AA vira requisito contratual em cliente grande
- **SEO técnico** — schema.org, OG, canonical por página
- **Governança** — o que o editor pode e não pode fazer
- **i18n** — a mesma LP em N idiomas sem N implementações

---

## 3. Por que empresas saem da Adobe

Levantamento com fontes públicas. Marquei o nível de confiança porque parte disso
é material de marketing de concorrente e precisa ser lido com desconto.

### 3.1 Saindo do AEM Sites tradicional

| # | Causa | Confiança | Evidência |
|---|---|---|---|
| C1 | **Custo total de propriedade** — licença de US$ 30k a 100k+/ano, implementação de 2 a 4× a licença no primeiro ano | Alta | Consistente em múltiplas fontes independentes |
| C2 | **Experiência do autor ruim** — muitos cliques, muitas abas, tarefa simples vira processo | Alta | Reclamação recorrente; citado como motivo direto de migração |
| C3 | **Lentidão de entrega** — workflow pesado de configuração atrasa publicação | Alta | Citado por Contentstack, Hygraph, Optimizely |
| C4 | **Gargalo de desenvolvimento** — marketing não publica sem dev | Alta | É a proposta de valor central de Webflow e Builder.io |
| C5 | **Escassez de talento AEM** — skill de nicho, caro e difícil de contratar | Alta | Recorrente |
| C6 | **Lock-in Adobe** — integração profunda com Analytics/Target/Campaign dificulta a saída | Média | Fonte é concorrente, mas o fato técnico procede |
| C7 | **Fim do suporte ao 6.5 (31/ago/2026)** — força decisão de migrar, e a janela abre a porta para reavaliar o fornecedor | Alta | Data oficial Adobe |

### 3.2 Saindo (ou não entrando) no AEM EDS

| # | Causa | Confiança | Observação |
|---|---|---|---|
| E1 | **Autoria document-based assusta o enterprise** — Google Docs/SharePoint como fonte de verdade não passa em governança | Alta | Motivo pelo qual o cliente pede Universal Editor |
| E2 | **Todo projeto começa do zero** — Block Collection é mínimo por design | Alta | Documentação oficial |
| E3 | **Curva de aprendizado do modelo de blocos** | Alta | Recorrente |
| E4 | **Backend complexo e transacional não encaixa** | Alta | Limitação real de arquitetura |
| E5 | **Personalização intensa exige arquitetura explícita** | Média-alta | Não é impossível, é trabalhoso |
| E6 | **Dependência do pipeline aem.live** — não roda local, não roda on-prem | Alta | Confirmado na prática montando o sandbox local |

### 3.3 O que o concorrente vende

- **Webflow** — o marketing publica campanha e monta teste A/B sozinho, em horas
- **Builder.io** — drag-and-drop visual, dev mantém controle da arquitetura
- **Contentstack / Contentful / Storyblok** — API-first, times independentes, time-to-market
- **Optimizely** — experimentação nativa como produto, não como integração

Todos vendem a mesma coisa com nomes diferentes: **autonomia do marketing**.

---

## 4. De causa de churn a princípio de produto

Esta é a seção que deve guiar cada decisão de componente. Cada princípio existe
para neutralizar uma causa específica.

| Princípio | Neutraliza | O que significa na prática |
|---|---|---|
| **P1. Autoria por intenção, não por átomo** | C2, C4 | O editor escolhe "Destaque", "Compacto", "Escuro" — não `padding-top: 32px`. Menos decisões, menos erro, resultado sempre apresentável |
| **P2. Zero-dev para página nova** | C3, C4, E2 | Toda LP do catálogo é montável só compondo blocos existentes. Se uma campanha precisou de dev, o catálogo falhou |
| **P3. Liberdade com trilho** | C4 vs. entropia | Variantes curadas e finitas. O editor combina livremente dentro do que o design system permite. É o antídoto ao Webflow sem importar o caos do Webflow |
| **P4. Performance é feature do componente** | E4, diferencial EDS | Orçamento de CSS/JS por bloco, imagem responsiva por padrão, zero dependência externa. Lighthouse 100 não é meta de projeto, é critério de aceite do componente |
| **P5. Universal Editor em primeiro lugar** | E1 | Todo bloco nasce com modelo `_bloco.json`. Autoria em WYSIWYG dentro do AEM, sem Google Docs |
| **P6. Acessível e tagueado de fábrica** | requisito de contrato | WCAG AA e data layer no componente, não no projeto |
| **P7. Tema sem deploy** | C3, 2.2 | Troca de marca e de campanha via tokens, não via código |
| **P8. Documentação viva** | C5, E3 | Cada bloco com página de exemplo executável. Reduz a dependência do especialista AEM |
| **P9. Experimentação nativa** | Optimizely | Variante de bloco por audiência/experimento usando o que o EDS já oferece |

---

## 5. Arquitetura proposta

### 5.1 Camadas

```
┌─────────────────────────────────────────────────────────┐
│  5. Blueprints de página    LPs prontas, clonáveis      │
│     (campanha, produto, evento, captura)                │
├─────────────────────────────────────────────────────────┤
│  4. Blocos Smart            hero, prova social, preços, │
│     (o catálogo)            comparativo, FAQ, form...   │
├─────────────────────────────────────────────────────────┤
│  3. Variantes               sistema de "aparências"     │
│     (a liberdade curada)    por bloco e por seção       │
├─────────────────────────────────────────────────────────┤
│  2. Primitivas              tipografia, botão, mídia,   │
│     (compartilhadas)        grid, elevação              │
├─────────────────────────────────────────────────────────┤
│  1. Tokens                  cor, escala, espaçamento,   │
│     (CSS custom properties) raio, sombra, motion        │
└─────────────────────────────────────────────────────────┘
```

A camada 1 é o que permite o P7: trocar marca é trocar um arquivo de tokens.
A camada 3 é o que permite o P1 e o P3 — e é o coração do acelerador.

### 5.2 Como isso vive num repo EDS

```
blocks/<nome>/
  _<nome>.json      modelo do Universal Editor (definição, campos, filtros)
  <nome>.js         decorate() — o mínimo possível
  <nome>.css        estilos do bloco, consumindo tokens
styles/
  tokens.css        camada 1 — o arquivo que troca por marca
  primitives.css    camada 2
  styles.css        global mínimo (LCP)
models/             modelos de página e seção
blueprints/         camada 5 — LPs de referência
docs/               camada 8 do princípio P8
```

### 5.3 O mecanismo de variantes

É a decisão de arquitetura mais importante e a que precisa ser validada primeiro.

O EDS já resolve isso parcialmente: classes extras no nome do bloco (`Hero (escuro,
compacto)`) viram classes CSS. A proposta é formalizar isso em três eixos fixos,
iguais em **todos** os blocos do catálogo:

- **Aparência** — claro / escuro / marca / neutro
- **Densidade** — compacto / padrão / espaçoso
- **Ênfase** — sutil / padrão / destaque

Três eixos com 3–4 valores cada geram dezenas de combinações a partir de um único
bloco, todas dentro do design system, todas sem CSS novo. O editor ganha liberdade
combinatória real; o dev não escreve nada por campanha.

A alternativa que **não** devemos seguir é replicar a dialog do Smart Container do
AEM tradicional, com controle atômico de padding e cor por breakpoint. Naquele
contexto fazia sentido — no EDS, cada controle atômico vira CSS por instância e
ataca o P4. A lição do Smart Container que **vale** trazer é outra: presets por
intenção, com nomes humanos, e um motor único de estilo como fonte de verdade.

### 5.4 Orçamento de performance

Critério de aceite por bloco, não do site:

- CSS do bloco ≤ 4 KB não comprimido
- JS do bloco ≤ 4 KB e assíncrono; bloco sem interação não tem JS
- Zero dependência externa, zero webfont adicional
- Imagem sempre via `<picture>` responsivo do EDS
- Nada acima da dobra depende de JS para aparecer

### 5.5 O que fica fora do EDS

Honestidade arquitetural evita retrabalho: checkout, área logada, busca com
faceta pesada e workflow transacional **não** vão para o EDS (E4). O acelerador
deve ter um padrão de integração para esses casos, não uma tentativa de resolvê-los
dentro do bloco.

---

## 6. Catálogo v1 — primeiro corte

Priorizado por (frequência de demanda) × (ausência no EDS oficial).

**Onda 1 — o mínimo que destrava uma LP inteira sem dev**
1. Hero Smart (imagem/vídeo/split, eyebrow, CTA duplo)
2. Prova Social (logos, contadores, selos)
3. Cards Smart (benefício, ícone, mídia, link)
4. CTA Band (faixa de conversão)
5. FAQ (accordion com schema.org)
6. Formulário Smart (validação, consentimento, integração)

**Onda 2 — o que fecha a venda**
7. Preços / Planos
8. Comparativo
9. Depoimento com métrica
10. Estatísticas em destaque
11. Sticky CTA

**Onda 3 — diferenciação criativa**
12. Bento Grid
13. Timeline / passo a passo
14. Galeria com lightbox
15. Countdown de campanha
16. Mapa / localizador

**Transversais (não são blocos, são infraestrutura)**
- Motor de tokens e temas
- Motor de variantes
- Camada de data layer e eventos
- Kit de acessibilidade
- Blueprints de LP

---

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Virar "mais uma biblioteca de blocos" sem diferencial | O diferencial é o motor de variantes + blueprints, não a quantidade de blocos |
| Peso acumulado matar o Lighthouse | Orçamento por bloco no CI, medido a cada PR |
| Liberdade demais gerar páginas feias | Variantes finitas e curadas; o editor não escreve CSS |
| Acoplar ao design de um cliente | Tokens obrigatórios; nenhum valor fixo dentro de bloco |
| Adobe lançar equivalente oficial | Provável em algum grau. O fosso defensável é o conjunto blueprints + governança + serviço, não os blocos isolados |
| Manutenção de N clientes na mesma base | Versionamento e política de breaking change definidos **antes** do primeiro cliente |

---

## 8. O que precisa ser validado antes de codar

Este levantamento é baseado em fontes públicas e em padrão de mercado. Antes de
escrever o primeiro bloco, validar com dados reais da Webjump:

1. **As 10 seções mais pedidas nos projetos AEM da casa nos últimos 24 meses** —
   substituir a tabela 2.1 por dado próprio
2. **Quanto tempo hoje leva uma LP nova**, do briefing ao ar — é a métrica que o
   acelerador promete mover, e sem a linha de base não há prova
3. **Quantas horas de dev por campanha** — vira o cálculo de ROI da proposta
4. **Quais clientes já estão em EDS** e quais estão em 6.5 com prazo de agosto/2026
5. **O motor de variantes** — provar com 1 bloco antes de assumir para 16

## 9. Métricas de sucesso do acelerador

- Tempo de LP nova: de X dias para horas (medir X primeiro)
- % de campanhas que foram ao ar sem ticket de dev — meta > 80%
- Lighthouse ≥ 95 em toda LP publicada com o catálogo
- Nº de blocos sob medida por projeto — deve cair a cada cliente novo

---

## 10. Próximos passos

1. Fechar o levantamento interno da seção 8 (dado da casa)
2. Especificar o motor de tokens e o motor de variantes — é a fundação
3. Provar a arquitetura com o Hero Smart de ponta a ponta no sandbox local
4. Definir política de versionamento antes do segundo bloco
5. Só então abrir a Onda 1

---

## Fontes

- [AEM Block Collection — aem.live](https://www.aem.live/developer/block-collection)
- [Adobe EDS in 2026: costs, gotchas — Noice](https://noice.net.au/blog/adobe-edge-delivery-services/)
- [10 Hidden AEM disadvantages — Contentstack](https://www.contentstack.com/blog/all-about-headless/10-hidden-adobe-experience-manager-disadvantages-that-are-slowing-you-down)
- [Why AEM customers migrate to Optimizely](https://www.optimizely.com/insights/blog/migrating-from-aem-to-optimizely/)
- [Migrate AEM to headless CMS — Hygraph](https://hygraph.com/blog/migrate-aem-to-headless-cms)
- [AEM Cost Guide 2026 — Brainvire](https://www.brainvire.com/blog/adobe-aem-cost-breakdown-us-enterprises/)
- [Adobe Experience Manager pricing — ITQlick](https://www.itqlick.com/adobe-experience-manager/pricing)
- [Webflow enterprise insights — Flowout](https://www.flowout.com/blog/webflow-enterprise-insights-from-developers-designers-marketers)
- [Webflow vs Builder.io — Webstacks](https://www.webstacks.com/blog/webflow-vs-builder)
- [Enterprise landing page design 2026 — SaaSHero](https://www.saashero.net/design/enterprise-landing-page-design-2026/)
- [Landing page social proof tactics — SaaSHero](https://www.saashero.net/content/landing-page-social-proof-examples/)
