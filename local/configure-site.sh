#!/usr/bin/env bash
# Aponta o "code bus" do site para o franklin-proxy, que serve o código do disco.
#
# Sem isso o author busca component-models.json em
# https://{branch}--{repo}--{owner}.aem.page e, como esse site não existe no
# aem.live, o render estoura 500 (CodeBusInfoException). A propriedade `url` da
# cloud config sobrescreve essa origem — é a única forma de rodar sem o pipeline.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CFG="/conf/${EDS_SITE}/settings/cloudconfigs/edge-delivery-service-configuration/jcr:content"
CODE_URL="http://localhost:${FRANKLIN_PROXY_PORT}"

if ! author_up; then
  fail "author fora do ar — rode: npm run local:author"
  exit 1
fi

CODE=$(curl -s -o /dev/null -w '%{http_code}' -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" \
  "${AUTHOR_URL}${CFG}.json")
if [ "$CODE" != "200" ]; then
  fail "cloud config não encontrada em ${CFG} (HTTP $CODE)"
  echo "  o site '${EDS_SITE}' foi criado? rode: npm run local:site-template"
  exit 1
fi

step "apontando o code bus do site '${EDS_SITE}' para ${CODE_URL}"
curl -s -o /dev/null -w '' -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" \
  -X POST "${AUTHOR_URL}${CFG}" -F "url=${CODE_URL}"

CURRENT=$(curl -s -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" "${AUTHOR_URL}${CFG}.json" \
  | tr ',' '\n' | grep '"url"' | cut -d'"' -f4)

if [ "$CURRENT" = "$CODE_URL" ]; then
  ok "url = $CURRENT"
else
  fail "não consegui gravar a propriedade url (valor atual: '$CURRENT')"
  exit 1
fi

# O endpoint do UE precisa ir por configMgr: o SDK local não resolve os
# placeholders $[env:...] da config de fábrica.
step "apontando o Universal Editor para https://localhost:${UES_PORT}"
curl -s -o /dev/null -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" \
  -X POST "${AUTHOR_URL}/system/console/configMgr/com.adobe.aem.wcm.franklin.internal.UniversalEditorSettings" \
  -d "apply=true" -d "action=ajaxConfigManager" -d '$location=' \
  -d "endpoint=https://localhost:${UES_PORT}" -d "plugin=xwalk" \
  -d "propertylist=endpoint,plugin"

# o configMgr responde antes do componente reativar com a config nova
for _ in $(seq 1 10); do
  if curl -s -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" \
    "${AUTHOR_URL}/content/${EDS_SITE}/index.html" | grep -q "urn:adobe:aue:config:service"; then
    ok "meta urn:adobe:aue:config:service presente na página"
    exit 0
  fi
  sleep 2
done

warn "a meta do editor não apareceu em 20s — confira o configMgr"
