#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  echo
  echo "==> $1"
  shift
  "$@"
}

run_step "Backend composer validate" bash -lc "cd '$ROOT/backend' && composer validate --strict"
run_step "Backend dependency audit" bash -lc "cd '$ROOT/backend' && composer audit"
run_step "Backend testing migrations" bash -lc "cd '$ROOT/backend' && php artisan config:clear && php artisan route:clear && php artisan migrate:fresh --env=testing --force"
run_step "Backend tests" bash -lc "cd '$ROOT/backend' && APP_ENV=testing php artisan test"
run_step "Backend deploy cache checks" bash -lc "cd '$ROOT/backend' && php artisan config:clear && php artisan route:clear && php artisan schedule:list --env=testing && php artisan route:cache && php artisan config:cache && php artisan config:clear && php artisan route:clear"
run_step "Admin frontend install, lint, build, audit" bash -lc "cd '$ROOT/frontend/admin-app' && npm ci && npm run lint && npm run build && npm audit --audit-level=moderate"
run_step "User frontend install, lint, build, audit" bash -lc "cd '$ROOT/frontend/user-app' && npm ci && npm run lint && npm run build && npm audit --audit-level=moderate"

echo
echo "Predeploy check completed."
