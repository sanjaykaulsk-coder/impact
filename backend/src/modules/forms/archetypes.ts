import { FieldType, FormArchetype, SkuMovementType } from '@prisma/client';

// The four report-format archetypes as form presets (report-format-library §1), so an admin
// configuring a new campaign's forms starts from the shape that already matches 27 years of
// Impact's actual field-report formats. Pure functions of the campaign's SKU list — no database
// access — so the migration acceptance test (§5.1, structural fidelity) can exercise them
// directly.
//
// A note on the DFR preset: per §2, the DFR *report* is always a rollup query over record-level
// data, never independently entered. The DFR preset therefore builds the record-level form for
// campaigns whose natural record IS the team/day summary (e.g. a mela stall's single daily
// count) — one response per team per day. Campaigns with outlet/consumer granularity use the
// PROFILE preset, and their DFR view comes entirely from the rollup endpoint.

export interface ArchetypeQuestion {
  key: string;
  fieldType: FieldType;
  label: string;
  helpText?: string;
  order: number;
  isMandatory: boolean;
  options?: { label: string; value: string; order: number }[];
  controlsJson?: Record<string, unknown>;
  formulaExpression?: string;
  validationRules?: { ruleType: string; configJson: Record<string, unknown> }[];
}

export interface ArchetypeSection {
  title: string;
  order: number;
  questions: ArchetypeQuestion[];
}

export interface ArchetypeSku {
  id: string;
  skuCode: string;
  name: string;
  variantLabel: string | null;
}

export interface SkuBinding {
  campaignSkuId: string;
  movementType: SkuMovementType;
  metric: 'QUANTITY' | 'AMOUNT';
}

// The controlsJson key every SKU-bound question carries. ExecutionService reads this to write
// SkuMovement rows at submission time; syncSkuQuestions uses it to know which questions to
// regenerate when the SKU master changes mid-campaign.
export const SKU_BINDING_KEY = 'skuBinding';

export function skuBindingOf(controlsJson: unknown): SkuBinding | null {
  if (!controlsJson || typeof controlsJson !== 'object') return null;
  const binding = (controlsJson as Record<string, unknown>)[SKU_BINDING_KEY];
  if (!binding || typeof binding !== 'object') return null;
  const b = binding as Record<string, unknown>;
  if (typeof b.campaignSkuId !== 'string' || typeof b.movementType !== 'string' || typeof b.metric !== 'string') {
    return null;
  }
  return b as unknown as SkuBinding;
}

const MOBILE_VALIDATION = {
  ruleType: 'pattern',
  configJson: { pattern: '^[6-9][0-9]{9}$', message: 'Enter a valid 10-digit mobile number' },
};

function skuLabel(sku: ArchetypeSku): string {
  return sku.variantLabel ? `${sku.name} (${sku.variantLabel})` : sku.name;
}

function bound(sku: ArchetypeSku, movementType: SkuMovementType, metric: 'QUANTITY' | 'AMOUNT'): Record<string, unknown> {
  return { [SKU_BINDING_KEY]: { campaignSkuId: sku.id, movementType, metric } };
}

// "Sales by SKU" — the workbook's per-SKU Qty/Amt column-group pattern shared by DFR and Profile.
function salesBySkuSection(skus: ArchetypeSku[], order: number): ArchetypeSection {
  const questions: ArchetypeQuestion[] = [];
  skus.forEach((sku, i) => {
    questions.push({
      key: `sku_${sku.id}_sold_qty`,
      fieldType: 'QUANTITY',
      label: `${skuLabel(sku)} — quantity sold`,
      order: i * 2,
      isMandatory: false,
      controlsJson: { ...bound(sku, 'SOLD', 'QUANTITY'), min: 0 },
    });
    questions.push({
      key: `sku_${sku.id}_sold_amt`,
      fieldType: 'SALES_VALUE',
      label: `${skuLabel(sku)} — sales amount`,
      order: i * 2 + 1,
      isMandatory: false,
      controlsJson: { ...bound(sku, 'SOLD', 'AMOUNT'), min: 0 },
    });
  });
  return { title: 'Sales by SKU', order, questions };
}

function totalsSection(order: number): ArchetypeSection {
  return {
    title: 'Totals (auto-computed)',
    order,
    questions: [
      {
        key: 'auto_total_qty',
        fieldType: 'AUTO_CALCULATED',
        label: 'Total quantity',
        order: 0,
        isMandatory: false,
        formulaExpression: 'SKU_QTY_TOTAL(SOLD)',
      },
      {
        key: 'auto_total_amt',
        fieldType: 'AUTO_CALCULATED',
        label: 'Total sales amount',
        order: 1,
        isMandatory: false,
        formulaExpression: 'SKU_AMOUNT_TOTAL(SOLD)',
      },
    ],
  };
}

function remarksSection(order: number): ArchetypeSection {
  return {
    title: 'Remarks',
    order,
    questions: [{ key: 'remarks', fieldType: 'REMARKS', label: 'Remarks', order: 0, isMandatory: false }],
  };
}

function dfrSections(skus: ArchetypeSku[]): ArchetypeSection[] {
  return [
    {
      title: 'Day summary',
      order: 0,
      questions: [
        { key: 'report_date', fieldType: 'DATE', label: 'Report date', order: 0, isMandatory: true },
        { key: 'outlets_visited', fieldType: 'INTEGER', label: 'Outlets visited', order: 1, isMandatory: true, controlsJson: { min: 0 } },
        { key: 'outlets_converted', fieldType: 'INTEGER', label: 'Outlets converted', order: 2, isMandatory: false, controlsJson: { min: 0 } },
      ],
    },
    salesBySkuSection(skus, 1),
    totalsSection(2),
    remarksSection(3),
  ];
}

function profileSections(skus: ArchetypeSku[]): ArchetypeSection[] {
  return [
    {
      title: 'Outlet / consumer',
      order: 0,
      questions: [
        { key: 'outlet_details', fieldType: 'RETAILER_DETAILS', label: 'Outlet details', order: 0, isMandatory: true },
        {
          key: 'contact_mobile',
          fieldType: 'SHORT_TEXT',
          label: 'Contact mobile',
          order: 1,
          isMandatory: false,
          validationRules: [MOBILE_VALIDATION],
        },
        { key: 'capture_gps', fieldType: 'GPS', label: 'Location (GPS)', order: 2, isMandatory: false },
      ],
    },
    salesBySkuSection(skus, 1),
    totalsSection(2),
    remarksSection(3),
  ];
}

// One column-group per SKU, keyed by invoice/distributor (report-format-library §1.3). DAMAGED is
// zero-default: not observed in the source sheets but required by spec §22's formula.
function stockReconciliationSections(skus: ArchetypeSku[]): ArchetypeSection[] {
  const perSku: ArchetypeQuestion[] = [];
  skus.forEach((sku, i) => {
    const base = i * 8;
    const l = skuLabel(sku);
    perSku.push(
      { key: `sku_${sku.id}_opening`, fieldType: 'QUANTITY', label: `${l} — opening stock`, order: base, isMandatory: false, controlsJson: { ...bound(sku, 'OPENING_STOCK', 'QUANTITY'), min: 0 } },
      { key: `sku_${sku.id}_received`, fieldType: 'QUANTITY', label: `${l} — received`, order: base + 1, isMandatory: false, controlsJson: { ...bound(sku, 'RECEIVED', 'QUANTITY'), min: 0 } },
      { key: `sku_${sku.id}_sold_qty`, fieldType: 'QUANTITY', label: `${l} — sold quantity`, order: base + 2, isMandatory: false, controlsJson: { ...bound(sku, 'SOLD', 'QUANTITY'), min: 0 } },
      { key: `sku_${sku.id}_sold_amt`, fieldType: 'SALES_VALUE', label: `${l} — invoice amount`, order: base + 3, isMandatory: false, controlsJson: { ...bound(sku, 'SOLD', 'AMOUNT'), min: 0 } },
      { key: `sku_${sku.id}_scheme_qty`, fieldType: 'QUANTITY', label: `${l} — scheme card quantity`, order: base + 4, isMandatory: false, controlsJson: { ...bound(sku, 'FREE_SCHEME', 'QUANTITY'), min: 0 } },
      { key: `sku_${sku.id}_scheme_val`, fieldType: 'SALES_VALUE', label: `${l} — scheme card value`, order: base + 5, isMandatory: false, controlsJson: { ...bound(sku, 'FREE_SCHEME', 'AMOUNT'), min: 0 } },
      { key: `sku_${sku.id}_sampled`, fieldType: 'QUANTITY', label: `${l} — sampled quantity`, order: base + 6, isMandatory: false, controlsJson: { ...bound(sku, 'SAMPLED', 'QUANTITY'), min: 0 } },
      { key: `sku_${sku.id}_damaged`, fieldType: 'QUANTITY', label: `${l} — damaged quantity`, order: base + 7, isMandatory: false, controlsJson: { ...bound(sku, 'DAMAGED', 'QUANTITY'), min: 0 }, helpText: 'Enter 0 if none' },
    );
  });
  const closing: ArchetypeQuestion[] = skus.map((sku, i) => ({
    key: `sku_${sku.id}_closing_actual`,
    fieldType: 'QUANTITY',
    label: `${skuLabel(sku)} — actual closing stock (counted)`,
    order: i,
    isMandatory: false,
    controlsJson: { ...bound(sku, 'CLOSING_STOCK_ACTUAL', 'QUANTITY'), min: 0 },
  }));
  return [
    {
      title: 'Invoice / distributor',
      order: 0,
      questions: [
        { key: 'distributor_name', fieldType: 'SHORT_TEXT', label: 'Distributor name', order: 0, isMandatory: true },
        { key: 'invoice_number', fieldType: 'SHORT_TEXT', label: 'Invoice number', order: 1, isMandatory: false },
        { key: 'invoice_date', fieldType: 'DATE', label: 'Invoice date', order: 2, isMandatory: true },
      ],
    },
    { title: 'Stock movement — per SKU', order: 1, questions: perSku },
    { title: 'Actual closing stock (physical count)', order: 2, questions: closing },
    remarksSection(3),
  ];
}

// Structurally different from the other three: no SKU column-groups at all (§1.4).
function enquiryLeadsSections(): ArchetypeSection[] {
  return [
    {
      title: 'Lead details',
      order: 0,
      questions: [
        { key: 'contact_details', fieldType: 'CONSUMER_DETAILS', label: 'Contact details', order: 0, isMandatory: true },
        {
          key: 'contact_mobile',
          fieldType: 'SHORT_TEXT',
          label: 'Contact mobile',
          order: 1,
          isMandatory: true,
          validationRules: [MOBILE_VALIDATION],
        },
        {
          key: 'lead_temperature',
          fieldType: 'DROPDOWN',
          label: 'Lead temperature',
          order: 2,
          isMandatory: true,
          options: [
            { label: 'Hot', value: 'HOT', order: 0 },
            { label: 'Warm', value: 'WARM', order: 1 },
            { label: 'Cold', value: 'COLD', order: 2 },
          ],
        },
        {
          key: 'customer_type',
          fieldType: 'DROPDOWN',
          label: 'Customer type',
          order: 3,
          isMandatory: false,
          options: [
            { label: 'B2B', value: 'B2B', order: 0 },
            { label: 'Consumer', value: 'CONSUMER', order: 1 },
          ],
        },
        { key: 'company_interest', fieldType: 'SHORT_TEXT', label: 'Company / product interest', order: 4, isMandatory: false },
      ],
    },
    remarksSection(1),
  ];
}

export function buildArchetypeSections(archetype: FormArchetype, skus: ArchetypeSku[]): ArchetypeSection[] {
  switch (archetype) {
    case 'DFR':
      return dfrSections(skus);
    case 'PROFILE':
      return profileSections(skus);
    case 'STOCK_RECONCILIATION':
      return stockReconciliationSections(skus);
    case 'ENQUIRY_LEADS':
      return enquiryLeadsSections();
  }
}

// Which section titles an archetype regenerates when the SKU master changes mid-campaign. Only
// these are rebuilt by syncSkuQuestions — everything else the admin customised is left alone.
export function skuSectionTitles(archetype: FormArchetype): string[] {
  switch (archetype) {
    case 'DFR':
    case 'PROFILE':
      return ['Sales by SKU'];
    case 'STOCK_RECONCILIATION':
      return ['Stock movement — per SKU', 'Actual closing stock (physical count)'];
    case 'ENQUIRY_LEADS':
      return [];
  }
}
