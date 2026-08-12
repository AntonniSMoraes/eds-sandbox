#!/usr/bin/env bash
# aem up servindo o código local sobre o conteúdo do author (via franklin-proxy).
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if [ ! -f "$ROOT/local/certs/localhost.pem" ]; then
  fail "certificados ausentes — rode: npm run local:certs"
  exit 1
fi

exec aem up \
  --url "http://localhost:${FRANKLIN_PROXY_PORT}" \
  --port "${AEM_CLI_PORT}" \
  --tls-cert "$ROOT/local/certs/localhost.pem" \
  --tls-key "$ROOT/local/certs/localhost-key.pem" \
  --no-open
