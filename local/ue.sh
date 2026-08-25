#!/usr/bin/env bash
# Sobe o Universal Editor Service local, servindo HTTPS nativo.
#
# O binário não é redistribuível: baixe em https://experience.adobe.com/downloads
# (Adobe Experience Manager as a Cloud Service > "Universal Editor Service-vX.X.X.zip"),
# extraia e coloque universal-editor-service.cjs em local/universal-editor-service/.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

UE_DIR="$ROOT/local/universal-editor-service"
UE_BIN="$UE_DIR/universal-editor-service.cjs"
CERT="$ROOT/local/certs/localhost.pem"
KEY="$ROOT/local/certs/localhost-key.pem"

if [ ! -f "$UE_BIN" ]; then
  fail "universal-editor-service.cjs não encontrado"
  echo
  echo "  1. https://experience.adobe.com/downloads (login com Adobe ID)"
  echo "  2. seção 'Adobe Experience Manager as a Cloud Service'"
  echo "  3. filtre por 'universal' e baixe Universal Editor Service-vX.X.X.zip"
  echo "  4. extraia e copie o .cjs para:"
  echo "     $UE_DIR/"
  exit 1
fi

if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  fail "certificados ausentes — rode: npm run local:certs"
  exit 1
fi

# UES_CORS_PRIVATE_NETWORK permite o editor, servido de experience.adobe.com (rede
# pública), falar com um serviço em localhost (rede privada) — sem ele o browser
# bloqueia por Private Network Access.
#
# UES_DISABLE_IMS_VALIDATION porque o token do editor é emitido para a nuvem da
# Adobe e não tem como ser validado contra um author em localhost.
cat > "$UE_DIR/.env" <<EOF
UES_PORT=${UES_PORT}
UES_CERT=${CERT}
UES_PRIVATE_KEY=${KEY}
UES_TLS_REJECT_UNAUTHORIZED=false
UES_CORS_PRIVATE_NETWORK=true
UES_DISABLE_IMS_VALIDATION=true
EOF

step "subindo o Universal Editor Service em https://localhost:${UES_PORT}"
cd "$UE_DIR"
exec node universal-editor-service.cjs
