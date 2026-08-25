#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AEM_SDK_DIR="/Users/luizfrare/aem-sdk/crx-quickstart"
AEM_AUTHOR_PORT="4502"
AEM_AUTHOR_USER="admin"
AEM_AUTHOR_PASSWORD="admin"
AEM_JVM_OPTS="-server -Xmx4096m -Djava.awt.headless=true"
EDS_ORG="local"
EDS_SITE="sandbox"
EDS_BRANCH="main"
FRANKLIN_PROXY_PORT="4503"
UES_PORT="8000"
AEM_TLS_PORT="8443"
AEM_CLI_PORT="3000"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

AUTHOR_URL="http://localhost:${AEM_AUTHOR_PORT}"
DELIVERY_BASE="${AUTHOR_URL}/bin/franklin.delivery/${EDS_ORG}/${EDS_SITE}/${EDS_BRANCH}"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

author_up() {
  curl -sf -o /dev/null -m 3 -u "${AEM_AUTHOR_USER}:${AEM_AUTHOR_PASSWORD}" \
    "${AUTHOR_URL}/libs/granite/core/content/login.html" 2>/dev/null
}
