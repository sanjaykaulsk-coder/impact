import { SkuMovementType } from '@prisma/client';

// Evaluator for FormQuestion.formulaExpression (report-format-library §2): the workbook's
// auto-computed columns ("Total Qty", "Total Sales Amt.") are spreadsheet formulas summing the
// per-SKU cells of the same row — never separately-typed numbers. The grammar here is deliberately
// tiny and safe (no eval, no identifiers other than the two SKU-total functions):
//
//   expr    := term (('+' | '-') term)*
//   term    := factor (('*' | '/') factor)*
//   factor  := NUMBER | '(' expr ')' | FUNC '(' MOVEMENT_TYPE ')'
//   FUNC    := SKU_QTY_TOTAL | SKU_AMOUNT_TOTAL
//
// Examples: "SKU_QTY_TOTAL(SOLD)", "SKU_AMOUNT_TOTAL(SOLD) + SKU_AMOUNT_TOTAL(FREE_SCHEME)".

export interface SkuTotals {
  quantity: number;
  amount: number;
}

export type SkuTotalsByMovement = Partial<Record<SkuMovementType, SkuTotals>>;

const MOVEMENT_TYPES = new Set<string>([
  'OPENING_STOCK',
  'RECEIVED',
  'SOLD',
  'FREE_SCHEME',
  'SAMPLED',
  'DAMAGED',
  'CLOSING_STOCK_ACTUAL',
]);

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'func'; name: 'SKU_QTY_TOTAL' | 'SKU_AMOUNT_TOTAL'; movement: SkuMovementType }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = expression;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'op', op: ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const value = Number(src.slice(i, j));
      if (Number.isNaN(value)) throw new Error(`Invalid number at position ${i} in formula "${expression}"`);
      tokens.push({ kind: 'number', value });
      i = j;
      continue;
    }
    if (/[A-Z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Z_]/.test(src[j])) j++;
      const name = src.slice(i, j);
      if (name !== 'SKU_QTY_TOTAL' && name !== 'SKU_AMOUNT_TOTAL') {
        throw new Error(`Unknown function "${name}" in formula "${expression}"`);
      }
      // Expect (MOVEMENT_TYPE)
      if (src[j] !== '(') throw new Error(`Expected "(" after ${name} in formula "${expression}"`);
      const close = src.indexOf(')', j);
      if (close === -1) throw new Error(`Unclosed "(" after ${name} in formula "${expression}"`);
      const movement = src.slice(j + 1, close).trim();
      if (!MOVEMENT_TYPES.has(movement)) {
        throw new Error(`Unknown movement type "${movement}" in formula "${expression}"`);
      }
      tokens.push({ kind: 'func', name, movement: movement as SkuMovementType });
      i = close + 1;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" at position ${i} in formula "${expression}"`);
  }
  return tokens;
}

export function evaluateFormula(expression: string, totals: SkuTotalsByMovement): number {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseFactor(): number {
    const token = next();
    if (!token) throw new Error(`Unexpected end of formula "${expression}"`);
    if (token.kind === 'number') return token.value;
    if (token.kind === 'func') {
      const bucket = totals[token.movement];
      if (!bucket) return 0;
      return token.name === 'SKU_QTY_TOTAL' ? bucket.quantity : bucket.amount;
    }
    if (token.kind === 'lparen') {
      const value = parseExpr();
      const closing = next();
      if (!closing || closing.kind !== 'rparen') throw new Error(`Missing ")" in formula "${expression}"`);
      return value;
    }
    if (token.kind === 'op' && token.op === '-') return -parseFactor();
    throw new Error(`Unexpected token in formula "${expression}"`);
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek()?.kind === 'op' && ((peek() as { op: string }).op === '*' || (peek() as { op: string }).op === '/')) {
      const op = (next() as { kind: 'op'; op: '*' | '/' }).op;
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseExpr(): number {
    let value = parseTerm();
    while (peek()?.kind === 'op' && ((peek() as { op: string }).op === '+' || (peek() as { op: string }).op === '-')) {
      const op = (next() as { kind: 'op'; op: '+' | '-' }).op;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error(`Trailing tokens in formula "${expression}"`);
  return result;
}

// Spec §22's reconciliation formula, in one place so the report endpoint, the submission-time
// mismatch check, and the acceptance test all share the identical arithmetic. FREE_SCHEME is
// deliberately NOT part of expected-closing per report-format-library §3 ("scheme, not in §22
// formula — additive"); it is reported alongside, never subtracted.
export function expectedClosingStock(t: {
  opening: number;
  received: number;
  sold: number;
  sampled: number;
  damaged: number;
}): number {
  return t.opening + t.received - t.sold - t.sampled - t.damaged;
}
