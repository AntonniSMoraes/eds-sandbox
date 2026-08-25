# Sandbox local: Edge Delivery Services com AEM authoring

Ambiente 100% local para autorar no **Universal Editor** e desenvolver blocos EDS,
sem document-based authoring e sem AEM as a Cloud Service.

## Arquitetura

```
 browser ──► https://localhost:3000        aem up (aem-cli)
                    │                      serve blocks/, styles/, scripts/ do disco (hot reload)
                    │                      e proxeia o resto
                    ▼
             http://localhost:4503         local/franklin-proxy.mjs
                    │       ▲              / → /content/{site}/index.html
                    │       │              reescreve /content/{site}.resource/* → /*
                    │       │              e serve o "code bus" do disco
                    ▼       │
             http://localhost:4502         AEM SDK author (conteúdo no JCR)
                    ▲                      component-models.json & cia ──┘
                    │
 experience.adobe.com/#/aem/editor ──► https://localhost:8000 ──► https://localhost:8443
             (UI do editor)            Universal Editor Service     author em https (tls-proxy)
```

Portas: `3000` site · `3002` site em http (opcional) · `4502` author ·
`4503` proxy + code bus · `8000` UE service · `8443` author em https.

## O que roda local e o que não roda

| | |
|---|---|
| Autoria WYSIWYG no Universal Editor | ✅ local |
| Conteúdo (JCR do author) | ✅ local |
| Blocos, CSS, JS com hot reload | ✅ local |
| Modelos de bloco (`component-*.json`) | ✅ local |
| Pipeline aem.live (`.aem.page`/`.aem.live`), preview/publish, CDN, RUM | ❌ SaaS Adobe — não existe versão local |

A UI do editor é servida pela Adobe (`experience.adobe.com`) e exige login com Adobe ID —
mas ela roda no seu browser e conversa com o **UE service local**, que conversa com o
**author local**. Nenhum conteúdo sai da máquina.

## Setup

```bash
npm run local:setup            # .env, deps, git, certs, OSGi configs
npm run local:author           # sobe o AEM SDK (1º boot demora)
npm run local:site-template    # baixa o site template do xwalk
```

Importe o site no author (`Sites > Create > Site from template > Import`) usando
**org/repo iguais a `EDS_ORG`/`EDS_SITE` do `.env`**.

O mesmo pode ser feito por API, que é como este sandbox foi montado:

```bash
curl -u admin:admin -F "file=@local/downloads/aem-sites-*.zip" \
  http://localhost:4502/bin/wcm/site-template/import

curl -u admin:admin -X POST http://localhost:4502/bin/asynccommand \
  -F operation=asyncCreateSiteFromSiteTemplate \
  -F siteName=sandbox -F siteTitle=Sandbox \
  -F gitHubUrl=https://github.com/local/sandbox \
  -F siteTemplatePath=/conf/global/site-templates/aem-sites-with-edge-delivery-services-template-0.2.0
```

Com o site criado, o dia a dia é um comando só:

```bash
npm run dev
```

E, para autorar, baixe o `universal-editor-service.cjs` em
[Software Distribution](https://experience.adobe.com/downloads) (AEM as a Cloud Service →
Universal Editor Service), coloque em `local/universal-editor-service/` e rode
`npm run local:ue`. O binário não é redistribuível, por isso não vem no repo.

## Dia a dia

```bash
npm run dev
```

Um terminal. O comando sobe o author se estiver parado (ele é daemon, não ocupa
terminal), reaplica a configuração do site, e roda proxy, tls, UE service e `aem up`
como filhos com log prefixado. `Ctrl+C` derruba os quatro; o author fica de pé.

No editor, cole `https://localhost:3000/` no campo **Site URL**.

`npm run local:doctor` diagnostica, `npm run local:open` abre o editor.
Os scripts `local:*` continuam existindo para rodar cada peça isolada.

Para só olhar o site sem lidar com o certificado self-signed:
`npm run local:web:http` → `http://localhost:3002/`.

## As três amarrações que fazem isso funcionar

Nada disso é padrão — são as adaptações que substituem o pipeline do aem.live.

**1. O code bus.** O author busca `component-models.json`, `component-definition.json`
e `component-filters.json` em `https://{branch}--{repo}--{owner}.aem.page`. Como esse
site não existe no aem.live, o render estoura
`500 CodeBusInfoException: Component Models could not be loaded`.
A cloud config do site tem uma propriedade `url` que **sobrescreve** essa origem —
`local:configure:site` aponta ela para o próprio proxy, que serve esses arquivos do
disco. Sem isso, nada renderiza.

**2. `/content/{site}` e não `/bin/franklin.delivery`.** O endpoint de entrega
(`/bin/franklin.delivery/{org}/{site}/{branch}/index.html`) é o que o pipeline consome,
e ele **remove as meta tags do Universal Editor**. O render do author
(`/content/{site}/index.html`) traz o mesmo markup EDS **com** `data-aue-*` e as metas
`urn:adobe:aue:*`. É esse que o proxy serve. Para inspecionar o markup do pipeline,
troque `DELIVERY_MODE=pipeline` no `.env`.

**3. Reescrita do `.resource`.** O author referencia o código como
`/content/{site}.resource/scripts/aem.js`. O proxy reescreve para `/scripts/aem.js`,
e aí quem serve é o `aem up` — ou seja, o seu working copy com hot reload.
Assets do DAM (`/content/dam/...`) passam direto para o author.

## Armadilhas conhecidas

- **O botão "Editar" do console de Sites local dá 404** ("A custom errorhandler for
  404 responses"). Não é configuração: o console navega via unified shell, que reescreve
  tudo para `/ui#/aem/...`, e o `/ui` **não existe no SDK local** — a UI do editor é
  hospedada pela Adobe, não vem no quickstart. Autore sempre pelo editor hospedado:
  `npm run local:open` → `https://experience.adobe.com/#/aem/editor` → cole
  `https://localhost:3000/` no campo **Site URL**.
- **`aem up` exige `git remote origin`** mesmo com `--url`. O setup cria um placeholder.
- **O SDK local não resolve `$[env:...]`** nas configs de fábrica. Por isso o endpoint
  do UE é gravado via configMgr pelo `local:configure:site`, e não pela variável
  `AEM_XWALK_AUE_ENDPOINT`.
- **Certificado self-signed**: o browser reclama em `https://localhost:3000` e o
  Universal Editor não consegue carregar a página no iframe (mostra "está demorando
  mais que o esperado para responder"). Instale o mkcert (`brew install mkcert`),
  rode `mkcert -install` (pede senha) e `npm run local:certs`. Para autorar isso é
  obrigatório, não cosmético.
- **`UES_CORS_PRIVATE_NETWORK=true`** no `.env` do UE service: sem ele o browser
  bloqueia por Private Network Access as chamadas de `experience.adobe.com` (rede
  pública) para o `localhost` (rede privada). O `local:ue` já escreve isso.
- **`error while loading head.html ... 404` no log do aem up**: esperado. O author
  já entrega o head completo; não há head.html remoto para o aem up comparar.
- **`https://universal-editor-service.adobe.io/cors.js`** aparece no markup e é
  hardcoded no bundle do AEM. É um script auxiliar de CORS, não o serviço do editor —
  o serviço é o da meta `urn:adobe:aue:config:service`.
- **404 no site**: `EDS_ORG`/`EDS_SITE` do `.env` não batem com o site criado no author.
- **Externalizer**: o author precisa se anunciar como `https://localhost:8443` na meta
  `urn:adobe:aue:system:aemconnection`. Em `http://localhost:4502` o browser bloquearia
  por mixed content, já que o editor roda em https. O `local:configure` grava isso.
- **`/config.json`**: é gerado pelo pipeline e não existe no repo. O proxy devolve `{}`
  para o author parar de reconsultar em loop.
- **401 no `POST https://localhost:8000/details`**: são dois problemas juntos, e os
  dois são inerentes a autorar contra um author local.
  1. O editor manda um token IMS emitido para a nuvem da Adobe, que o UE service não
     consegue validar contra `localhost`. Daí `UES_DISABLE_IMS_VALIDATION=true` no
     `.env` do serviço (o `local:ue` escreve).
  2. O editor manda `x-aemconnection-authorization` **vazio** — ele só sabe emitir
     token para instâncias na nuvem. O UE service repassa esse vazio ao AEM e leva
     401. Por isso o `tls-proxy` injeta `Authorization: Basic admin:admin` em tudo
     que passa pela `8443`. É seguro no sandbox: a porta escuta só em `127.0.0.1`,
     e a credencial é a mesma `admin/admin` do SDK.

## Blocos e autoria

O passo a passo de autorar e de criar/testar bloco está em [WORKFLOW.md](WORKFLOW.md),
com o bloco `aviso` no repo como exemplo completo.
