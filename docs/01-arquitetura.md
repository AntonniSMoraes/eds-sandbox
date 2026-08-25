# Webjump Smart Components — arquitetura

Decisões tomadas na implementação da fundação, com o motivo e a evidência.
Levantamento e estratégia em [00-levantamento.md](00-levantamento.md).

## Camadas implementadas

```
styles/wj-tokens.css     camada 1 — tokens. O único arquivo que troca por marca
styles/wj-variants.css   camada 3 — motor de variantes (3 eixos)
blocks/hero-smart/       camada 4 — primeiro bloco do catálogo
```

Ambas as folhas entram no `head.html` como `<link>` separados, não como `@import`
dentro do `styles.css`. Dois motivos: `@import` serializa o download e ataca o LCP;
e separar tokens de variantes dá ciclos de cache diferentes — trocar a marca
invalida só o arquivo de tokens.

## ADR 1 — variantes pela propriedade `classes`

**Decisão:** o eixo de variantes viaja num campo `multiselect` chamado `classes`.

**Por quê:** o renderer de bloco do EDS (`core/franklin/components/block/v1/block`)
trata a propriedade `classes` de forma especial — ela vira o atributo `class` da div
do bloco em vez de virar linha de conteúdo. Sem JS, sem custo.

**Evidência:** o HTL do bloco usa `class="${block.classNames}"`, e a `Block.class`
lê `classes` como `String[]` incondicionalmente. Validado no sandbox:

```
classes = ["wj-escuro","wj-destaque","wj-hero-direita"]
→ class="hero-smart wj-escuro wj-destaque wj-hero-direita"
```

**Alternativa rejeitada:** campos separados `classes_aparencia`, `classes_densidade`,
`classes_enfase`. Seria melhor de usar (três selects em vez de um multiselect), mas
o suporte a `classes_*` está atrás do feature toggle **`FT_SITES-23499`** — confirmado
no bytecode da `Block.class`. Depender de toggle é depender de algo que pode não estar
ligado no ambiente do cliente. Quando virar padrão, dá para migrar sem tocar em CSS:
as classes emitidas são as mesmas.

**Consequência:** as opções do multiselect precisam ser autoexplicativas, já que
todos os eixos aparecem numa lista só. Daí o prefixo no rótulo: "Cor: escura",
"Espaço: compacto", "Ênfase: destaque".

## ADR 2 — variante remapeia token, nunca declara estilo

Uma classe de variante só redefine custom properties. Ela nunca escreve
`padding`, `font-size` ou `color` direto.

Isso é o que faz qualquer combinação dos três eixos funcionar sem matriz de teste
e sem o bloco precisar conhecer as variantes. Um bloco novo entra no catálogo
consumindo os tokens certos e ganha os três eixos de graça.

A única exceção é o bloco de aparência pintar fundo e cor de texto — sem isso a
troca de cor não teria efeito visível e cada bloco teria que lembrar de aplicar.

**Validado por estilo computado**, alternando classes na mesma instância:

| combinação | fundo | padding vertical | escala do título |
|---|---|---|---|
| claro | `#fff` | 48px | padrão |
| escuro | `rgb(15,18,24)` | 48px | padrão |
| marca | `rgb(13,110,253)` | 48px | padrão |
| escuro + compacto | escuro | 24px | padrão |
| escuro + espaçoso | escuro | 72px | padrão |
| escuro + sutil | escuro | 48px | −20% |
| escuro + destaque | escuro | 48px | +20% |

Os três eixos compõem de forma independente, que é o requisito.

## ADR 3 — o limite de 4 células é lei

O `eslint-plugin-xwalk` reprova bloco com mais de 4 células
(`xwalk/max-cells`). O Hero Smart nasceu com 7 e foi reprovado.

**Decisão:** obedecer, não silenciar a regra. Um modelo enxuto é mais fácil de
autorar, e a regra é a plataforma comunicando a filosofia de conteúdo do EDS.

Como couberam 4 células:
- `classes`, `titulo`, `texto`, `imagem`
- campos com sufixo `Alt`, `Text`, `Title`, `Type` e `MimeType` são **absorvidos**
  pelo campo base e não geram célula — por isso `imagemAlt` sai de graça
- o chapéu foi cortado; volta como variante se a demanda aparecer

## ADR 4 — botões vêm de link formatado, não de campo

O `scripts.js` do boilerplate já converte link em botão: **negrito** vira
`.button.primary`, *itálico* vira secundário, os dois juntos viram `.accent`.

**Decisão:** usar isso em vez de campos `ctaLink`/`ctaTexto`. Economiza 2 células,
dá liberdade de quantos botões o autor quiser, e mantém o comportamento igual ao
resto do site.

**Pegadinha que precisa estar na descrição do campo:** o boilerplate exige **um
link por parágrafo** — ele só converte quando o texto do parágrafo é exatamente o
texto do link. Dois links no mesmo parágrafo não viram botão nenhum. Descoberto
testando, e é o tipo de coisa que o autor nunca adivinharia.

## ADR 5 — countdown: o que foi decidido

**Campo de data:** `"component": "date-time"`. É o tipo padrão do Universal Editor
para data. **Ainda não validado no editor** — se o campo não renderizar, a
alternativa é `text` com formato ISO documentado na descrição.

**Fuso:** a data é interpretada no fuso do visitante (`new Date(valor)`). Uma
campanha que termina "à meia-noite" termina à meia-noite de quem está olhando.
Se algum cliente precisar de fuso fixo, vira token de configuração, não código novo.

**Acessibilidade:** os números mudam a cada segundo e seriam ruído contínuo em
leitor de tela. O relógio é `aria-hidden`; só o encerramento é anunciado, uma vez,
por um `role="status"`. É o oposto do que a maioria dos countdown de mercado faz.

**Sem data válida o bloco some** (`display: none`) em vez de quebrar a página ou
mostrar `NaN`. No editor o autor vê o campo obrigatório vazio.

**Limpeza:** o `setInterval` é encerrado no fim da contagem. Countdown esquecido
rodando para sempre é vazamento comum nesse tipo de bloco.

## ADR 6 — blocos container: tipo do item pelo conteúdo

A Prova Social aceita dois tipos de item na mesma faixa (logo e número). Duas
decisões que valem para todo bloco container do catálogo:

**O tipo do item é detectado pelo conteúdo**, não pelo `data-aue-model`. Se a
linha tem `<picture>`, é logo; senão é número. O atributo só existe em autoria
com Universal Editor — detectar por conteúdo mantém o bloco funcionando também
em document-based, sem código condicional.

**`moveInstrumentation` é obrigatório** quando a linha vira outro elemento.
Sem ele o `data-aue-resource` fica para trás e o item deixa de ser editável no
editor — o bloco renderiza igual e a falha só aparece na hora de autorar.
Validado: os 4 itens da instância no author mantiveram o atributo.

## ADR 7 — guarda dos eixos de variante

Um multiselect não impede marcar duas cores. Aconteceu na prática: o Hero ficou
com `wj-claro` **e** `wj-neutro`, e o fundo renderizado foi decidido pela ordem
da folha de estilo, não pela intenção de quem editou.

**Decisão:** `normalizeVariants()` no `scripts.js` remove as opções conflitantes
do mesmo eixo e mantém **a última escolhida** — a ordem do array de `classes` é
a ordem de seleção, então "vale o último clique" é o que o multiselect sugere.
Roda uma vez por página, custo zero por bloco.

**É remendo, não solução.** A solução é o autor não conseguir escolher duas, o
que exige os três selects separados do toggle `FT_SITES-23499` (ADR 1). Enquanto
esse caminho não for viável em cliente, a guarda segura.

## ADR 8 — o "Bloco Livre" é a seção, não um bloco

A pergunta era: dá para o autor montar qualquer coisa sem desenvolver?

**Descartado: campo de HTML/CSS cru.** É trivial de implementar e destrói o
produto. Conteúdo colado não tem `data-aue-*`, então o autor perde a edição no
lugar e volta a editar código numa caixa de texto. Fora do orçamento de
performance, fora do sistema de tokens (não repinta na troca de marca) e sem
garantia de acessibilidade. Seria um Webflow pior dentro do AEM — exatamente as
causas C2/C3 do levantamento.

**Decisão: liberdade por composição.** No modelo do EDS, bloco não aninha bloco —
quem contém blocos é a **seção**. Então o canvas mora ali.

O mecanismo é nativo: o `decorateSections` do `aem.js` lê o *section metadata* e
transforma o campo `style` em **classes na seção**; qualquer outra chave vira
`data-*`. Ou seja, a seção já era um container extensível — faltava o vocabulário
de layout.

`styles/wj-secao.css` implementa esse vocabulário: 2/3/4 colunas, assimétrico
60/40, bento, sobreposto, largura total, meia tela, tela cheia, alinhamento,
imagem de fundo com escurecer/clarear, fundo fixo, cantos e sombra — mais os três
eixos de cor, espaço e ênfase, que funcionam sem nenhuma linha nova porque só
remapeiam token.

O autor combina blocos diferentes dentro de um layout que ele escolhe. **Validado
no author**: seção de 2 colunas, tema escuro, meia tela, fundo escurecido e
âncora `#planos`, contendo um Aviso e um Countdown lado a lado. Nenhum código
escrito para essa composição existir.

**A imagem de fundo reaproveita o `<picture>`** que o section metadata já trouxe,
em vez de virar `background-image` no CSS: mantém o `srcset` responsivo do EDS e
evita baixar o mesmo arquivo duas vezes.

### Duas armadilhas de CSS que custaram caro

**`display: contents` é indiscriminado.** A regra que faz os `*-wrapper` sumirem
para os blocos virarem itens do grid também pegava a camada de fundo — que perdeu
a caixa, ignorou o `position: absolute` e virou mais um item da grade. Corrigido
com `:not(.wj-sec-fundo)` em cada seletor de layout.

**`:has()` tem especificidade alta.** `.section:has(> .wj-sec-fundo) > div` pesa
mais que `.section .wj-sec-fundo` e sobrescrevia o `position: absolute` do fundo,
jogando a imagem de volta para o fluxo. Mesmo remédio: `:not(.wj-sec-fundo)`.

As duas passam despercebidas em revisão e só aparecem medindo geometria no
navegador. Ficam aqui como precedente para os próximos layouts.

## Correção — filtro da seção

Os blocos do catálogo não estavam no filtro `section`, então renderizavam (foram
criados por API) mas o autor **não conseguia inserir** um novo pelo editor.
`hero-smart`, `prova-social`, `countdown` e `aviso` entraram no filtro.

Todo bloco novo precisa entrar em `models/_section.json` — senão ele existe para
o desenvolvedor e não existe para quem autora.

## ADR 9 — receita primeiro, ingrediente depois

A crítica que motivou esta mudança veio de um teste real: na primeira interação
com o editor, o autor marcou `wj-claro` **e** `wj-neutro`. Não foi descuido — o
desenho pedia isso. Uma lista de 11 opções misturando quatro assuntos, onde cabia
ao autor agrupar mentalmente pelo prefixo e lembrar que só podia uma de cada
grupo, não é "autoria por intenção": é atomização com rótulo bonito.

**Decisão:** a superfície principal passa a ser um conjunto pequeno de **receitas
nomeadas por situação** — Impacto, Lançamento, Institucional, Editorial,
Discreto. Uma escolha, resultado previsível. Os formatos específicos do bloco
(imagem à direita, em linha, com separadores) continuam como ajuste opcional.

**Os eixos crus saíram do bloco.** Cor, espaço e ênfase agora existem só na
seção. Isso resolve de uma vez a duplicação que eu tinha criado: havia dois
lugares para definir a mesma coisa, sem regra dita sobre quem manda.

A regra passa a ser: **a seção define o ambiente; o bloco escolhe uma receita ou
herda.** Não escolher nada é a opção correta na maioria dos casos.

**Uma receita não declara estilo próprio.** Ela entra nas mesmas regras dos eixos
em `wj-variants.css`, então o valor de cada token continua morando num lugar só.
Adicionar receita é adicionar o nome dela a três ou quatro listas de seletor —
nunca copiar declarações.

**Validado por equivalência de estilo computado:** aplicando `wj-r-impacto` e
`wj-escuro wj-destaque wj-espacoso` no mesmo elemento, fundo, padding e cor de
texto vieram idênticos. A receita é um apelido de verdade, não uma segunda
implementação.

Resultado na lista do autor: hero de 11 opções em 4 grupos para **8 em 2 grupos**;
countdown para 7; prova social para 8.

**O que continua imperfeito.** O ideal era um `select` de escolha única para a
receita e outro para o formato. Testei e confirmei que `classes` aceita valor
único — um `select` funcionaria. Mas só existe um canal nativo para virar classe
(`classes`), e o bloco precisa de duas decisões independentes. Dois campos
exigiriam `classes_*`, que depende do toggle `FT_SITES-23499` (ADR 1). Enquanto
isso, é multiselect com dois grupos curtos e a guarda do ADR 7 impedindo duas
receitas ao mesmo tempo.

**Ainda pendente:** o truque de botão por negrito/itálico (ADR 4) continua sendo
conhecimento tribal. A correção é o Hero virar container e aceitar o componente
`button` do boilerplate como filho, o que dá botão explícito e descobrível.

## Orçamento no CI

`tools/wj-budget.mjs` mede cada bloco e falha o build acima do teto.
Está pendurado no `npm run lint`, que o workflow `.github/workflows/main.yaml`
já executa — ou seja, passou a valer sem tocar no CI.

Logo na primeira execução ele reprovou o `header` do boilerplate (5,3 KB de CSS,
6,3 KB de JS). Em vez de subir o teto, virou **exceção declarada com motivo** no
próprio script: continua sendo medido e aparece no relatório, mas não quebra o
build. A regra é que essa lista não cresça.

## Temas

`styles/temas/` guarda temas prontos. Trocar de marca é trocar o `href` do
`<link>` de tokens no `head.html` — nenhum bloco muda, nenhum CSS novo.

Um tema só pode redefinir tokens que já existem no arquivo base. Precisou de um
token novo, ele nasce em `wj-tokens.css` primeiro.

**Validado no navegador** alternando o tema na página de demonstração: o botão do
hero mudou de `rgb(13,110,253)` / raio 999px para `rgb(232,52,12)` / raio 4px.
A troca alcança forma, não só cor.

## Página de demonstração

`demo/variantes.html` — 10 combinações lado a lado, com alternador de tema.

Ela **importa os blocos de verdade** (`import decorarHero from
'/blocks/hero-smart/hero-smart.js'`) e roda o `decorate` no markup cru, em vez de
copiar o HTML final. Assim serve como teste de regressão: se um bloco quebrar, a
demo quebra junto.

Servida por `npm run local:web:http` em `http://localhost:3002/demo/variantes.html`.

## Convenções do catálogo

- Prefixo `wj-` em toda classe e todo token — o acelerador convive com código do
  cliente no mesmo repo
- Nenhum valor cru dentro de bloco: cor, espaço, raio e tipografia vêm de token
- Rótulos do autor em português, valores e classes em inglês/neutro
- Orçamento por bloco: CSS ≤ 4 KB, JS ≤ 4 KB, zero dependência externa
- Bloco sem interação não tem JS

## Estado atual

| Item | Situação |
|---|---|
| Camada de tokens | Implementada |
| Motor de variantes (3 eixos) | Implementado e validado |
| Hero Smart | Implementado, renderizando no sandbox |
| Countdown de Campanha | Implementado, validado no editor pelo autor |
| Prova Social | Implementado, logos e números na mesma faixa |
| Seção canvas (Bloco Livre) | Implementada, validada no author |
| Receitas (ADR 9) | Implementadas nos 3 blocos, equivalência validada |
| Orçamento no CI | Implementado, pendurado no `npm run lint` |
| Temas / troca de marca | Implementado e validado no navegador |
| Página de demonstração | Implementada — 10 combinações |
| Demais blocos da Onda 1 | Não iniciados |
| Blueprints de LP | Não iniciados |
| Autoria no Universal Editor | **Validada** — autor editou variantes e data pelo editor |

## Próximo passo

Antes de escrever o segundo bloco, abrir o Hero Smart no Universal Editor e
confirmar que o multiselect de variantes é utilizável de verdade pelo autor.
É a hipótese central do acelerador — se o multiselect for ruim de usar, o
mecanismo muda antes de replicar para 15 blocos.
