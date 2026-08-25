# Autorar e testar no sandbox

Dois ciclos independentes. Entender qual é qual economiza muito tempo de debug.

| | Ciclo do **código** | Ciclo do **conteúdo** |
|---|---|---|
| Você mexe em | `blocks/`, `styles/`, `scripts/` | páginas no Universal Editor |
| Mora em | disco, servido pelo `aem up` | JCR do author |
| Para ver | salvar o arquivo (hot reload) | recarregar a página |
| Se quebrar, olhe | console do browser, log do `aem up` | `error.log` do author |

Modelos de bloco (`_*.json`) ficam no meio: são código, mas o **author** também os lê
para instrumentar a página. Mexeu neles → `npm run build:json`.

## Subir o ambiente

```bash
npm run dev
```

Um terminal só. Sobe o author (se estiver parado), configura o site e roda proxy, tls,
UE service e `aem up` com log prefixado por serviço. `Ctrl+C` encerra.

`npm run local:doctor` diz o que está faltando. `npm run local:open` abre o editor.

## Autorar

1. `npm run local:open` → `https://experience.adobe.com/#/aem/editor`
2. Campo **Site URL**: `https://localhost:3000/`
3. Editar in-place; o painel de propriedades mostra os campos do modelo do bloco

Não use o botão "Editar" do console de Sites local — ele vai para `/ui#/aem/...`,
que não existe no SDK, e devolve 404.

O conteúdo grava direto no JCR do author. Não existe "publicar" aqui: o preview e o
live são do pipeline aem.live, que não roda local.

## Criar um bloco

O bloco `aviso` está no repo como exemplo completo e funcionando. Anatomia:

```
blocks/aviso/
├── _aviso.json    # definição + modelo + filtros (o que o editor mostra)
├── aviso.js       # decorate(block) — transforma o DOM
└── aviso.css      # estilos, sempre escopados em .aviso
```

**1. O modelo** (`_aviso.json`) tem três partes:

- `definitions` — como o bloco aparece na lista de componentes do editor.
  `template` são os valores iniciais quando o autor insere o bloco.
- `models` — os campos do painel de propriedades. **A ordem dos campos é a ordem
  das linhas no DOM** — é o contrato entre o autor e o seu `decorate`.
- `filters` — só para blocos container (quais filhos são permitidos). Bloco simples
  fica com `[]`.

**2. Compilar:**

```bash
npm run build:json
```

Isso varre `blocks/*/_*.json` e agrega em `component-definition.json`,
`component-models.json` e `component-filters.json` na raiz. O hook de pre-commit
faz isso sozinho, mas no sandbox você quer rodar na hora — sem isso o bloco não
aparece no editor.

**3. Decorar** (`aviso.js`). O AEM entrega uma linha por campo:

```html
<div class="aviso">
  <div><div>atencao</div></div>                    <!-- campo tipo -->
  <div><div><p>Texto do aviso.</p></div></div>     <!-- campo texto -->
</div>
```

E o `decorate` transforma:

```js
export default function decorate(block) {
  const [tipoRow, textoRow] = [...block.children];
  const tipo = tipoRow?.textContent.trim() || 'info';
  block.classList.add(`aviso-${tipo}`);
  tipoRow?.remove();
  if (textoRow) textoRow.classList.add('aviso-texto');
}
```

Pode remover nós à vontade: quando o autor edita no editor, o `editor-support.js`
redecora o bloco (ou recarrega a página) a partir do markup novo.

Trate campo ausente como normal — o autor pode não preencher. Daí o `?.` e o default.

## Testar

**O bloco renderiza?**

```bash
curl -sk https://localhost:3000/ | grep -A4 'class="aviso"'
```

Confira também o `data-aue-model="aviso"` no `<div>` do bloco: é isso que prova que
o **author** enxergou o seu modelo novo. Se ele não aparecer, o `build:json` não
rodou ou o proxy (code bus) está fora do ar.

**O CSS/JS chegou?**

```bash
curl -sk https://localhost:3000/blocks/aviso/aviso.css
```

Vem direto do seu working copy — inclusive alteração não commitada. Salvou, já valeu;
o `aem up` injeta livereload e o browser atualiza sozinho.

**Sem abrir o editor**, dá para criar conteúdo por API, que é o que o editor faz:

```bash
curl -u admin:admin -X POST \
  http://localhost:4502/content/sandbox/index/jcr:content/root/section/aviso \
  --form-string "jcr:primaryType=nt:unstructured" \
  --form-string "sling:resourceType=core/franklin/components/block/v1/block" \
  --form-string "name=Aviso" \
  --form-string "model=aviso" \
  --form-string "tipo=atencao" \
  --form-string "texto=<p>Texto do aviso.</p>"
```

Use `--form-string`, não `-F`: com `-F` o curl vê o `=<` de `texto=<p>` e tenta abrir
um arquivo. Para remover: `curl -u admin:admin -X DELETE <mesma-url>`.

**Fragmentos** (o que o `scripts.js` busca para header/footer):

```bash
curl -sk https://localhost:3000/nav.plain.html
```

**Markup do pipeline** — o que o aem.live receberia, sem a instrumentação do editor:
troque `DELIVERY_MODE=pipeline` no `.env` e reinicie o `npm run dev`.

## Apagar o exemplo

```bash
rm -rf blocks/aviso && npm run build:json
curl -u admin:admin -X DELETE \
  http://localhost:4502/content/sandbox/index/jcr:content/root/section/aviso
```

## O que não dá para testar aqui

Performance real de EDS (Lighthouse/RUM do pipeline), preview/publish, CDN, e o
comportamento do `.aem.live`. Para isso só com AEM as a Cloud Service + code sync.
O que o sandbox garante é o loop de autoria e o de código.
