#!/usr/bin/env bash
# Setup único do sandbox. Idempotente.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "1/5 .env"
if [ -f "$ROOT/.env" ]; then ok ".env já existe"; else cp "$ROOT/.env.example" "$ROOT/.env"; ok ".env criado a partir do .env.example"; fi

step "2/5 dependências"
if [ -d "$ROOT/node_modules" ]; then ok "node_modules já existe"; else (cd "$ROOT" && npm install); fi

step "3/5 git"
if ! git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
  git -C "$ROOT" remote add origin "https://github.com/${EDS_ORG}/${EDS_SITE}.git"
  ok "origin = https://github.com/${EDS_ORG}/${EDS_SITE}.git (placeholder; troque quando criar o repo real)"
else
  ok "origin = $(git -C "$ROOT" remote get-url origin)"
fi
if ! git -C "$ROOT" rev-parse HEAD >/dev/null 2>&1; then
  git -C "$ROOT" add -A
  git -C "$ROOT" -c user.email=local -c user.name=local commit -qm "chore: boilerplate xwalk + tooling de dev local"
  ok "commit inicial criado"
else
  ok "repo já tem commits"
fi

step "4/5 certificados"
bash "$ROOT/local/certs.sh"

step "5/5 OSGi configs do author"
bash "$ROOT/local/configure-author.sh"

step "pronto — próximos passos"
cat <<EOF
  1. npm run local:author          # sobe o AEM SDK (demora no 1º boot)
  2. npm run local:site-template   # baixa o zip e mostra como importar o site
  3. baixe o universal-editor-service.cjs -> local/universal-editor-service/
  4. npm run local:ue              # em outro terminal
  5. npm start                     # proxy + tls + aem up
  6. npm run local:doctor          # confere tudo

  Detalhes: LOCAL-DEV.md
EOF
