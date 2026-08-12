#!/usr/bin/env bash
# Sobe o Universal Editor Service local.
# O binário não é redistribuível: baixe em https://experience.adobe.com/downloads
# (Software Distribution > AEM as a Cloud Service > Universal Editor Service)
# e coloque universal-editor-service.cjs em local/universal-editor-service/.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

UE_DIR="$ROOT/local/universal-editor-service"
UE_BIN="$UE_DIR/universal-editor-service.cjs"

if [ ! -f "$UE_BIN" ]; then
  fail "universal-editor-service.cjs não encontrado"
  echo
  echo "  1. abra https://experience.adobe.com/downloads"
  echo "  2. filtre por 'Universal Editor Service' (AEM as a Cloud Service)"
  echo "  3. extraia e copie o .cjs para:"
  echo "     $UE_DIR/"
  exit 1
fi

cat > "$UE_DIR/.env" <<EOF
UES_PORT=${UES_PORT}
UES_TLS_REJECT_UNAUTHORIZED=false
EOF

step "subindo o Universal Editor Service em http://localhost:${UES_PORT}"
cd "$UE_DIR"
exec node universal-editor-service.cjs
