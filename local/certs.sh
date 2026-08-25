#!/usr/bin/env bash
# Gera o par de certificados usado pelo aem up (https://localhost:3000) e pelo tls-proxy.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CERT_DIR="$ROOT/local/certs"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/localhost.pem" ] && [ -f "$CERT_DIR/localhost-key.pem" ]; then
  ISSUER=$(openssl x509 -in "$CERT_DIR/localhost.pem" -noout -issuer 2>/dev/null)
  # Um cert self-signed (issuer == subject == localhost) não serve para o Universal
  # Editor: o browser recusa o iframe. Se o mkcert apareceu depois, regera sozinho.
  if echo "$ISSUER" | grep -q "CN=localhost" && command -v mkcert >/dev/null 2>&1; then
    warn "certificado atual é self-signed e o mkcert está disponível — regerando"
    rm -f "$CERT_DIR/localhost.pem" "$CERT_DIR/localhost-key.pem"
  else
    ok "certificados já existem em local/certs (apague para regerar)"
    exit 0
  fi
fi

if command -v mkcert >/dev/null 2>&1; then
  step "gerando certificado com mkcert"

  # Gerar a folha não precisa de sudo. Instalar a CA no trust store precisa,
  # e é o único passo que exige o usuário — por isso a falha aqui não aborta.
  mkcert -install >/dev/null 2>&1 || true

  if ! mkcert -cert-file "$CERT_DIR/localhost.pem" -key-file "$CERT_DIR/localhost-key.pem" \
       localhost 127.0.0.1 ::1 >/dev/null 2>&1; then
    fail "mkcert não conseguiu gerar o certificado"
    exit 1
  fi
  ok "certificado gerado em local/certs"

  CAROOT=$(mkcert -CAROOT 2>/dev/null)
  if security verify-cert -c "$CERT_DIR/localhost.pem" >/dev/null 2>&1; then
    ok "CA do mkcert confiável no sistema"
  else
    echo
    warn "a CA do mkcert ainda NÃO está no trust store do macOS."
    warn "sem isso o Universal Editor não carrega https://localhost:${AEM_CLI_PORT} no iframe."
    echo
    echo "  rode (vai pedir a sua senha):"
    echo "      mkcert -install"
    echo "  e depois reinicie a stack: npm start"
    echo "  (CA em ${CAROOT})"
  fi
  exit 0
fi

step "gerando certificado self-signed com openssl"
warn "mkcert não instalado — o browser vai reclamar do certificado."
warn "para um certificado confiável: brew install mkcert && npm run local:certs"

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "$CERT_DIR/localhost-key.pem" \
  -out "$CERT_DIR/localhost.pem" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null

ok "certificado self-signed gerado em local/certs"
echo
echo "Para confiar nele no macOS (opcional, pede senha):"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_DIR/localhost.pem"
