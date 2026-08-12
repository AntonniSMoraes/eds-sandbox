#!/usr/bin/env bash
# Gera o par de certificados usado pelo aem up (https://localhost:3000) e pelo tls-proxy.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CERT_DIR="$ROOT/local/certs"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/localhost.pem" ] && [ -f "$CERT_DIR/localhost-key.pem" ]; then
  ok "certificados já existem em local/certs (apague para regerar)"
  exit 0
fi

if command -v mkcert >/dev/null 2>&1; then
  step "gerando certificado com mkcert (confiável no sistema)"
  mkcert -install
  mkcert -cert-file "$CERT_DIR/localhost.pem" -key-file "$CERT_DIR/localhost-key.pem" localhost 127.0.0.1 ::1
  ok "certificado confiável gerado"
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
