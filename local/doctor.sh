#!/usr/bin/env bash
# Diagnóstico do sandbox: diz exatamente qual peça está faltando.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "pré-requisitos"
command -v java >/dev/null && ok "java $(java -version 2>&1 | head -1 | sed 's/.*"\(.*\)".*/\1/')" || fail "java ausente"
command -v node >/dev/null && ok "node $(node -v)" || fail "node ausente"
command -v aem  >/dev/null && ok "aem-cli $(aem --version 2>/dev/null)" || fail "aem-cli ausente (npm i -g @adobe/aem-cli)"
[ -d "$ROOT/node_modules" ] && ok "node_modules" || fail "node_modules (rode: npm install)"
[ -f "$ROOT/.env" ] && ok ".env" || warn ".env ausente (usando defaults; cp .env.example .env)"

step "git remote (o aem up exige um 'origin')"
if git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
  ok "origin = $(git -C "$ROOT" remote get-url origin)"
else
  fail "sem remote origin — rode: npm run local:setup"
fi
git -C "$ROOT" rev-parse HEAD >/dev/null 2>&1 && ok "commit inicial presente" || fail "repo sem commit — rode: npm run local:setup"

step "certificados"
if [ -f "$ROOT/local/certs/localhost.pem" ]; then ok "local/certs"; else fail "faltam certs (npm run local:certs)"; fi

step "OSGi configs do author"
for f in org.apache.sling.engine.impl.SlingMainServlet.cfg.json \
         org.apache.sling.security.impl.ReferrerFilter.cfg.json \
         com.adobe.granite.cors.impl.CORSPolicyImpl~universal-editor.cfg.json; do
  [ -f "$AEM_SDK_DIR/install/$f" ] && ok "$f" || fail "$f (npm run local:configure)"
done

step "Universal Editor Service"
[ -f "$ROOT/local/universal-editor-service/universal-editor-service.cjs" ] \
  && ok "binário presente" \
  || fail "universal-editor-service.cjs ausente (veja npm run local:ue)"

step "serviços"
author_up && ok "author  $AUTHOR_URL" || fail "author fora do ar (npm run local:author)"
port_busy "$UES_PORT"             && ok "ue      https://localhost:$UES_PORT"      || warn "ue service parado (npm run local:ue)"
port_busy "$FRANKLIN_PROXY_PORT"  && ok "proxy   http://localhost:$FRANKLIN_PROXY_PORT (+ code bus)" || warn "franklin-proxy parado (npm run dev)"
port_busy "$AEM_TLS_PORT"         && ok "tls     https://localhost:$AEM_TLS_PORT"  || warn "tls-proxy parado (npm run dev)"
port_busy "$AEM_CLI_PORT"         && ok "aem up  https://localhost:$AEM_CLI_PORT"  || warn "aem up parado (npm run dev)"

step "site e conteúdo"
if author_up; then
  AUTH="-u ${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}"

  # shellcheck disable=SC2086
  CODE=$(curl -s $AUTH -o /dev/null -w '%{http_code}' "${AUTHOR_URL}/content/${EDS_SITE}/index.html")
  if [ "$CODE" = "200" ]; then
    ok "/content/${EDS_SITE}/index.html -> 200"
  else
    fail "/content/${EDS_SITE}/index.html -> $CODE (rode: npm run local:site-template)"
  fi

  # shellcheck disable=SC2086
  PAGE=$(curl -s $AUTH "${AUTHOR_URL}/content/${EDS_SITE}/index.html")
  echo "$PAGE" | grep -q "urn:adobe:aue:system:aemconnection" \
    && ok "instrumentação do Universal Editor presente" \
    || fail "sem meta urn:adobe:aue (rode: npm run local:configure:site)"

  # shellcheck disable=SC2086
  CFG=$(curl -s $AUTH "${AUTHOR_URL}/conf/${EDS_SITE}/settings/cloudconfigs/edge-delivery-service-configuration/jcr:content.json" \
    | tr ',' '\n' | grep '"url"' | cut -d'"' -f4)
  if [ -n "$CFG" ]; then
    ok "code bus -> $CFG"
  else
    fail "code bus sem override: o author vai buscar em *.aem.page e o render estoura 500"
    echo "     rode: npm run local:configure:site"
  fi
fi

step "cadeia completa"
if port_busy "$AEM_CLI_PORT"; then
  CODE=$(curl -sk -o /dev/null -w '%{http_code}' "https://localhost:${AEM_CLI_PORT}/")
  [ "$CODE" = "200" ] && ok "https://localhost:${AEM_CLI_PORT}/ -> 200" || fail "https://localhost:${AEM_CLI_PORT}/ -> $CODE"
fi
