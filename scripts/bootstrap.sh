#!/usr/bin/env bash
# One-command startup for IMPACT FIELD COMMAND (CLAUDE.md: "beginner-safe... one-command startup").
# Run this from the repo root: ./scripts/bootstrap.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
warn() { printf '\n\033[1;33m!!\033[0m %s\n' "$1"; }

command -v docker >/dev/null 2>&1 || { echo "Docker is required — install Docker Desktop first: https://www.docker.com/products/docker-desktop/"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required — install it first: https://nodejs.org/"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { say "Enabling pnpm via corepack"; corepack enable; }

say "Setting up environment files (dev placeholders only — see .env.example)"
[ -f .env ] || cp .env.example .env
[ -f backend/.env ] || cp .env backend/.env
[ -f web/.env.local ] || cp .env web/.env.local

say "Installing dependencies"
pnpm install

say "Starting Postgres + PostGIS, Redis, MinIO"
docker compose up -d

say "Waiting for Postgres to be healthy"
for i in $(seq 1 60); do
  status=$(docker compose ps --format json postgres 2>/dev/null | grep -o '"Health":"[a-z]*"' | cut -d'"' -f4 || true)
  [ "$status" = "healthy" ] && break
  sleep 2
done

say "Running database migrations"
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate:deploy

say "Seeding demo data (clients, campaigns, geographies, users, roles)"
pnpm --filter backend prisma:seed

say "Everything is ready."
echo "  Web admin:    http://localhost:3000"
echo "  Backend API:  http://localhost:4000/api/v1"
echo "  MinIO console: http://localhost:9001"
echo ""
echo "  Demo login numbers (MOCK OTP — code is shown on screen, never a real SMS):"
echo "    9000000001  Rohan Mehta      Super Admin (all campaigns)"
echo "    9000000009  Rahul Kumar      Promoter (Bihar campaign)"
echo "    9000000014  Rajesh Agarwal   Client Administrator (Shakti Consumer Products)"
echo "  Full list: docs/STATE.md"
echo ""

say "Starting backend + web (Ctrl+C to stop)"
pnpm dev
