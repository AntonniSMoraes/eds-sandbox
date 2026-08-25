#!/usr/bin/env bash
# Mesma coisa que o local:web, mas em HTTP puro numa porta separada.
# Serve para olhar o site sem brigar com o certificado self-signed.
# O Universal Editor NÃO funciona por aqui — ele exige https.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PORT="${AEM_CLI_HTTP_PORT:-3002}"

step "aem up em http://localhost:${PORT} (só visualização)"
exec aem up \
  --url "http://localhost:${FRANKLIN_PROXY_PORT}" \
  --port "$PORT" \
  --no-open \
  --no-stop-other
