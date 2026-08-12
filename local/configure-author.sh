#!/usr/bin/env bash
# Escreve as OSGi configs que o author local precisa para ser editável pelo
# Universal Editor. Vão em crx-quickstart/install/, que o Sling File Installer
# aplica no boot (e observa em runtime).
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

INSTALL_DIR="$AEM_SDK_DIR/install"
mkdir -p "$INSTALL_DIR"

step "gravando OSGi configs em $INSTALL_DIR"

# Sem isso o author manda X-Frame-Options: SAMEORIGIN e o editor não consegue
# carregar a página dentro do iframe.
cat > "$INSTALL_DIR/org.apache.sling.engine.impl.SlingMainServlet.cfg.json" <<'JSON'
{
  "sling.additional.response.headers": [
    "X-Content-Type-Options=nosniff"
  ]
}
JSON
ok "SlingMainServlet (X-Frame-Options removido)"

# O UE faz POST/PATCH no author vindo de outra origem; o referrer filter bloqueia
# por padrão.
cat > "$INSTALL_DIR/org.apache.sling.security.impl.ReferrerFilter.cfg.json" <<'JSON'
{
  "allow.empty": true,
  "allow.hosts": [
    "localhost:3000",
    "localhost:4502",
    "localhost:4503",
    "localhost:8000",
    "localhost:8001",
    "localhost:8443"
  ],
  "allow.hosts.regexp": [
    "^https?://localhost(:[0-9]+)?/.*$",
    "^https://experience\\.adobe\\.com/.*$"
  ],
  "filter.methods": ["POST", "PUT", "DELETE", "COPY", "MOVE", "PATCH"]
}
JSON
ok "ReferrerFilter (localhost + experience.adobe.com liberados)"

# CORS para as chamadas que o editor faz do browser direto no author.
cat > "$INSTALL_DIR/com.adobe.granite.cors.impl.CORSPolicyImpl~universal-editor.cfg.json" <<'JSON'
{
  "alloworigin": [
    "https://experience.adobe.com",
    "https://localhost:3000",
    "https://localhost:8001",
    "https://localhost:8443"
  ],
  "allowedpaths": [".*"],
  "supportedheaders": [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "Origin",
    "Accept",
    "x-aem-affinity-type"
  ],
  "supportedmethods": ["GET", "HEAD", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
  "supportscredentials": true,
  "maxage:Integer": 1800
}
JSON
ok "CORSPolicy (origens do editor liberadas)"

echo
warn "se o author já estiver rodando, reinicie: npm run local:author:stop && npm run local:author"
