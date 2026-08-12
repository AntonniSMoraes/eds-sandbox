# Sandbox local: Edge Delivery Services com AEM authoring

Ambiente 100% local para autorar no **Universal Editor** e desenvolver blocos EDS,
sem document-based authoring e sem AEM as a Cloud Service.

## Arquitetura

```
 browser ──► https://localhost:3000        aem up (aem-cli)
                    │                      serve blocks/, styles/, scripts/ do disco
                    │                      e proxeia o resto
                    ▼
             http://localhost:4503         local/franklin-proxy.mjs
                    │                      /produtos/foo → /bin/franklin.delivery/{org}/{site}/{branch}/produtos/foo.html
                    ▼
             http://localhost:4502         AEM SDK author (conteúdo no JCR)
                    ▲
                    │
 experience.adobe.com/#/aem/editor ──► https://localhost:8001 ──► :8000
             (UI do editor)              tls-proxy              Universal Editor Service local
```

Portas: `3000` site · `4502` author · `4503` proxy de entrega · `8000/8001` UE service · `8443` author em https.

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
npm run local:setup
```

Cria `.env`, instala deps, configura o git remote (o `aem up` exige um `origin`),
gera os certificados TLS e grava as OSGi configs em `crx-quickstart/install/`:

- `SlingMainServlet` — remove `X-Frame-Options: SAMEORIGIN` (senão o editor não
  consegue carregar a página no iframe)
- `ReferrerFilter` — libera `localhost` e `experience.adobe.com` para POST/PATCH
- `CORSPolicyImpl~universal-editor` — libera as origens do editor

Depois:

```bash
npm run local:author          # sobe o AEM SDK (1º boot demora)
npm run local:site-template   # baixa o zip do site template e mostra como importar
```

Importe o site no author (`Sites > Create > Site from template > Import`) usando
**org/repo iguais a `EDS_ORG`/`EDS_SITE` do `.env`** — é isso que o
`/bin/franklin.delivery/{org}/{site}/{branch}` resolve. Errou aqui, dá 404.

Por fim, baixe o `universal-editor-service.cjs` em
[Software Distribution](https://experience.adobe.com/downloads) (AEM as a Cloud Service →
Universal Editor Service) e coloque em `local/universal-editor-service/`.
O binário não é redistribuível, por isso não vem no repo.

## Dia a dia

```bash
npm run local:author   # terminal 1 (deixa rodando)
npm run local:ue       # terminal 2
npm start              # terminal 3 — franklin-proxy + tls-proxy + aem up
npm run local:open     # abre o editor e lista as URLs
```

No editor, cole `https://localhost:3000/` no campo **Site URL**.

Editar `blocks/**/*.js|css` recarrega na hora. Editar conteúdo no editor exige
refresh da página (não tem pipeline de preview local).

Diagnóstico de qualquer coisa quebrada:

```bash
npm run local:doctor
```

## Blocos

Fluxo normal do xwalk: crie o bloco em `blocks/<nome>/` e o modelo em
`models/_<nome>.json`, referenciando-o em `models/_component-definition.json`,
`_component-models.json` e `_component-filters.json`. O hook de pre-commit
(husky) compila os `component-*.json` da raiz — ou rode `npm run build:json`.

Sem o modelo o bloco existe no site mas não aparece no editor.

## Armadilhas conhecidas

- **`aem up` exige `git remote origin`** mesmo com `--url`. O setup cria um
  placeholder; troque quando criar o repo real.
- **Certificado self-signed**: o browser reclama em `https://localhost:3000`.
  Aceite a exceção uma vez, ou instale o `mkcert` (`brew install mkcert`) e
  rode `npm run local:certs` de novo para um cert confiável.
- **404 em `/bin/franklin.delivery/...`**: org/site do `.env` não batem com os do
  site criado no author, ou o site não foi criado.
- **Editor não abre a página**: quase sempre é `X-Frame-Options` ou CORS — confira
  que `npm run local:configure` rodou e que o author foi reiniciado depois.
- **`head.html`**: o author local não tem code bus, então o HTML dele pode vir sem
  as tags de script do EDS. O `franklin-proxy` injeta o `head.html` do repo quando
  detecta que faltam (`INJECT_HEAD=1`).
- O `AEM_XWALK_AUE_ENDPOINT` é exportado pelo `local/author.sh`; se você subir o
  author por fora, o editor vai tentar falar com o UE service hospedado da Adobe,
  que não enxerga o seu `localhost`.
