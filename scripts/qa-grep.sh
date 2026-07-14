#!/usr/bin/env bash
# QA grep — CLAUDE.md standing rule.
# Finds test values / dummy data / placeholder copy / unmarked mock integrations that could be
# reachable on a real user's screen. Seed data (backend/prisma/seed.ts and its data/ fixtures) is
# intentionally excluded — it is clearly-labelled demo data per spec §41, not a QA violation.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VIOLATIONS=0
say() { printf '%s\n' "$1"; }

section() {
  say ""
  say "== $1 =="
}

grep_ui() {
  # $1 = pattern, $2 = human label
  local matches
  matches=$(grep -rniE "$1" \
    --include="*.ts" --include="*.tsx" --include="*.dart" \
    web/src app/lib backend/src 2>/dev/null \
    | grep -viE "\.spec\.|\.test\.|__tests__|/test/" \
    || true)
  if [ -n "$matches" ]; then
    say "VIOLATION [$2]:"
    say "$matches"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

section "Lorem ipsum / filler copy"
grep_ui "lorem ipsum" "lorem ipsum filler text"

section "Generic placeholder/dummy labels used as displayed copy"
grep_ui "\"(dummy|fake|sample) (data|value|user|report)\"" "dummy/fake/sample copy in UI strings"

section "Hardcoded test credentials or OTP codes outside the mock adapter"
grep_ui "otp.{0,10}=.{0,5}['\"]?123456['\"]?" "hardcoded OTP code outside mock adapter"

section "TODO/FIXME left as user-facing text (not code comments)"
grep_ui ">\\s*(TODO|FIXME|PLACEHOLDER)\\b" "TODO/FIXME rendered as UI text"

section "Unmarked mock integrations (mock code must say MOCK)"
mock_files=$(grep -rlniE "mock" --include="*.ts" --include="*.tsx" backend/src 2>/dev/null | grep -viE "\.spec\.|\.test\." || true)
for f in $mock_files; do
  if ! grep -qiE "MOCK" "$f"; then
    say "VIOLATION [mock code without MOCK label]: $f"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

section "Real-looking Indian phone numbers outside seed data"
# Flags 10-digit Indian mobile patterns in web/app/backend source, excluding the seed script/fixtures.
matches=$(grep -rnE "[^0-9]([6-9][0-9]{9})[^0-9]" \
  --include="*.ts" --include="*.tsx" --include="*.dart" \
  web/src app/lib backend/src 2>/dev/null \
  | grep -viE "\.spec\.|\.test\.|seed" \
  || true)
if [ -n "$matches" ]; then
  say "VIOLATION [possible real-looking phone number outside seed data]:"
  say "$matches"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

say ""
if [ "$VIOLATIONS" -eq 0 ]; then
  say "QA grep: CLEAN — no violations found."
  exit 0
else
  say "QA grep: $VIOLATIONS violation group(s) found — see above."
  exit 1
fi
