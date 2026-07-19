/**
 * Migration acceptance test — docs/reference/report-format-library.md §5, the gate for Stage 3.1.
 *
 * Runs against a live, fully-migrated Postgres (the same migrations production runs), connecting
 * exactly the way the API does: fixtures are written with the owner role, but every service call
 * goes through the restricted `field_command_app` role + tenant GUC, so RLS is genuinely in force.
 *
 *   1. Structural fidelity — 3 representative campaign types' forms map every source-sheet column
 *      to exactly one FormQuestion with a valid FieldType.
 *   2. Aggregate correctness — the DFR rollup exactly equals hand-computed totals, to the cent.
 *   3. Stock reconciliation — spec §22's formula, and a mismatch raises an Exception record.
 *   4. Versioning — a mid-campaign SKU change never alters a published FormVersion.
 *   5. Tenant isolation — cross-tenant reads of SKU/movement tables return zero rows.
 *
 * Connection URLs default to the local docker-compose values; override with env vars
 * ACCEPTANCE_DB_URL (owner) and ACCEPTANCE_APP_DB_URL (app role).
 */
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { TenantContext } from '../../src/core/prisma/tenant-context';
import { FormsService } from '../../src/modules/forms/forms.service';
import { SkusService } from '../../src/modules/skus/skus.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { ExecutionService } from '../../src/modules/execution/execution.service';
import { buildArchetypeSections, skuBindingOf } from '../../src/modules/forms/archetypes';
import { evaluateFormula, expectedClosingStock } from '../../src/modules/reports/formula';

const OWNER_URL =
  process.env.ACCEPTANCE_DB_URL ??
  'postgresql://impact:impact_dev_password_change_me@localhost:5432/impact_field_command';
const APP_URL =
  process.env.ACCEPTANCE_APP_DB_URL ??
  'postgresql://field_command_app:impact_app_dev_password_change_me@localhost:5432/impact_field_command';

// Owner connection: fixtures + cross-checking only (RLS does not bind the owner's writes here —
// that's exactly why the services under test connect as the app role instead).
const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });

process.env.APP_DATABASE_URL = APP_URL;
const prismaService = new PrismaService();
const formsService = new FormsService(prismaService);
const skusService = new SkusService(prismaService);
const reportsService = new ReportsService(prismaService);
// ExecutionService's storage dependency is only used by the media endpoints, which this suite
// never touches — submitMilestoneResponse (the path under test) is storage-free.
const executionService = new ExecutionService(prismaService, undefined as never);

const RUN_TAG = `acc-${Date.now().toString(36)}`;

interface Fixture {
  tenantA: TenantContext;
  tenantB: TenantContext;
  userAId: string;
  locationId: string;
  skuSoapId: string;
  skuTeaId: string;
}

const fx = {} as Fixture;
let activitySeq = 0;

/** A fresh COMPLETED-ready activity instance for one more form submission. */
async function newActivity(tenant: TenantContext, milestoneStageId: string, workflowId: string) {
  activitySeq += 1;
  const campaignActivity = await owner.campaignActivity.findFirstOrThrow({
    where: { campaignId: tenant.campaignId },
  });
  return owner.activityInstance.create({
    data: {
      campaignActivityId: campaignActivity.id,
      campaignId: tenant.campaignId,
      clientId: tenant.clientId,
      locationId: fx.locationId,
      assignedUserId: fx.userAId,
      workflowId,
      currentStageId: milestoneStageId,
      status: 'IN_PROGRESS',
      plannedDate: new Date('2026-07-17'),
    },
  });
}

/** Publishes the template's current draft and wires a milestone to the published version. */
async function publishAndWireMilestone(tenant: TenantContext, templateId: string) {
  const published = await formsService.publish(tenant, templateId);
  const version = published.versions.find((v) => v.status === 'PUBLISHED')!;

  const workflow = await owner.workflow.create({
    data: { clientId: tenant.clientId, campaignId: tenant.campaignId, name: `wf-${RUN_TAG}-${activitySeq++}` },
  });
  const stage = await owner.workflowStage.create({
    data: { workflowId: workflow.id, name: 'Execution', order: 0 },
  });
  await owner.milestone.create({
    data: { workflowStageId: stage.id, name: 'Capture', order: 0, formVersionId: version.id },
  });
  return { workflowId: workflow.id, stageId: stage.id, version };
}

function questionsOf(version: {
  sections: { questions: { id: string; label: string; fieldType: string; controlsJson: unknown }[] }[];
}) {
  return version.sections.flatMap((s) => s.questions);
}

/**
 * Answers every SKU-bound question in the version from a per-(skuId, movementType, metric) map,
 * plus a type-appropriate answer for every mandatory non-SKU question (identity blocks, dates,
 * counts) so the submission passes the same mandatory-field validation a real field worker faces.
 */
function answersFor(
  version: Parameters<typeof questionsOf>[0],
  values: Record<string, number>,
) {
  const fieldResponses: { formQuestionId: string; valueJson: unknown }[] = [];
  for (const q of questionsOf(version)) {
    const binding = skuBindingOf(q.controlsJson);
    if (binding) {
      const key = `${binding.campaignSkuId}|${binding.movementType}|${binding.metric}`;
      if (values[key] !== undefined) {
        fieldResponses.push({ formQuestionId: q.id, valueJson: values[key] });
      }
      continue;
    }
    if (!(q as { isMandatory?: boolean }).isMandatory) continue;
    switch (q.fieldType) {
      case 'DATE':
        fieldResponses.push({ formQuestionId: q.id, valueJson: '2026-07-17' });
        break;
      case 'INTEGER':
        fieldResponses.push({ formQuestionId: q.id, valueJson: 3 });
        break;
      case 'RETAILER_DETAILS':
      case 'CONSUMER_DETAILS':
        fieldResponses.push({ formQuestionId: q.id, valueJson: { name: 'Acceptance Test Outlet' } });
        break;
      default:
        fieldResponses.push({ formQuestionId: q.id, valueJson: 'acceptance-test' });
    }
  }
  return fieldResponses;
}

beforeAll(async () => {
  const organisation = await owner.organisation.findFirstOrThrow();

  const clientA = await owner.client.create({
    data: { organisationId: organisation.id, name: `Acceptance Client A ${RUN_TAG}`, code: `ACC-A-${RUN_TAG}` },
  });
  const clientB = await owner.client.create({
    data: { organisationId: organisation.id, name: `Acceptance Client B ${RUN_TAG}`, code: `ACC-B-${RUN_TAG}` },
  });
  const campaignA = await owner.campaign.create({
    data: {
      clientId: clientA.id,
      name: `Acceptance Campaign A ${RUN_TAG}`,
      code: `ACC-CAMP-A-${RUN_TAG}`,
      status: 'LIVE',
      startDate: new Date('2026-07-01'),
    },
  });
  const campaignB = await owner.campaign.create({
    data: {
      clientId: clientB.id,
      name: `Acceptance Campaign B ${RUN_TAG}`,
      code: `ACC-CAMP-B-${RUN_TAG}`,
      status: 'LIVE',
      startDate: new Date('2026-07-01'),
    },
  });
  const user = await owner.user.create({
    data: { organisationId: organisation.id, fullName: `Acceptance Field User ${RUN_TAG}` },
  });
  const activityType = await owner.activityType.upsert({
    where: { code: 'VAN_CAMPAIGN' },
    update: {},
    create: { name: 'Van Campaign', code: 'VAN_CAMPAIGN' },
  });
  await owner.campaignActivity.create({
    data: { campaignId: campaignA.id, activityTypeId: activityType.id, name: 'Acceptance activity', configJson: {} },
  });
  const location = await owner.location.findFirst();

  fx.userAId = user.id;
  fx.locationId = location!.id;
  fx.tenantA = {
    clientId: clientA.id,
    campaignId: campaignA.id,
    userId: user.id,
    roleId: 'test-role',
    roleCode: 'test',
    roleName: 'Test',
  } as TenantContext;
  fx.tenantB = { ...fx.tenantA, clientId: clientB.id, campaignId: campaignB.id } as TenantContext;

  const soap = await skusService.create(fx.tenantA, {
    skuCode: `SOAP-${RUN_TAG}`,
    name: 'Herbal Soap',
    variantLabel: '75g',
    category: 'Personal Care',
    mrp: 35,
    sellingPrice: 32,
  });
  const tea = await skusService.create(fx.tenantA, {
    skuCode: `TEA-${RUN_TAG}`,
    name: 'Gold Tea',
    variantLabel: '250g',
    category: 'Beverages',
    mrp: 140,
    sellingPrice: 132,
  });
  fx.skuSoapId = soap.id;
  fx.skuTeaId = tea.id;
});

afterAll(async () => {
  // Remove every fixture this run created — on a dev machine this suite runs against the same
  // database the demo screens read, and the standing QA rule forbids test data being reachable
  // there. Order matters around the two Restrict FKs (FormResponse→FormVersion,
  // ActivityInstance→CampaignActivity); everything else cascades from the client rows.
  const campaignIds = [fx.tenantA.campaignId, fx.tenantB.campaignId];
  await owner.skuMovement.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await owner.formResponse.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await owner.exception.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await owner.activityInstance.deleteMany({ where: { campaignId: { in: campaignIds } } });
  await owner.client.deleteMany({ where: { id: { in: [fx.tenantA.clientId, fx.tenantB.clientId] } } });
  await owner.user.deleteMany({ where: { id: fx.userAId } });

  await prismaService.$disconnect();
  await owner.$disconnect();
});

describe('§5.1 Structural fidelity — three representative campaign types', () => {
  const skus = [
    { id: 'sku-1', skuCode: 'S1', name: 'Herbal Soap', variantLabel: '75g' },
    { id: 'sku-2', skuCode: 'S2', name: 'Gold Tea', variantLabel: '250g' },
  ];

  it('Van campaign (DFR + Profile): every source column maps to exactly one question', () => {
    // DFR sheet columns: Date | Outlets Visited | Outlets Converted | [SKU n Qty/Amt]* | Total Qty | Total Amt | Remarks
    const dfr = buildArchetypeSections('DFR', skus);
    const dfrQuestions = dfr.flatMap((s) => s.questions);
    expect(dfrQuestions.filter((q) => q.fieldType === 'DATE')).toHaveLength(1);
    expect(dfrQuestions.filter((q) => q.fieldType === 'INTEGER')).toHaveLength(2); // visited + converted
    expect(dfrQuestions.filter((q) => q.fieldType === 'QUANTITY')).toHaveLength(skus.length);
    expect(dfrQuestions.filter((q) => q.fieldType === 'SALES_VALUE')).toHaveLength(skus.length);
    expect(dfrQuestions.filter((q) => q.fieldType === 'AUTO_CALCULATED')).toHaveLength(2); // Total Qty + Total Amt
    expect(dfrQuestions.filter((q) => q.fieldType === 'REMARKS')).toHaveLength(1);

    // Profile sheet columns: identity | mobile | GPS | per-SKU | totals | remarks
    const profile = buildArchetypeSections('PROFILE', skus);
    const profileQuestions = profile.flatMap((s) => s.questions);
    expect(profileQuestions.filter((q) => q.fieldType === 'RETAILER_DETAILS')).toHaveLength(1);
    expect(profileQuestions.filter((q) => q.fieldType === 'GPS')).toHaveLength(1);
    expect(profileQuestions.filter((q) => q.fieldType === 'QUANTITY')).toHaveLength(skus.length);
    expect(profileQuestions.filter((q) => q.fieldType === 'SALES_VALUE')).toHaveLength(skus.length);
    const mobile = profileQuestions.find((q) => q.label === 'Contact mobile');
    expect(mobile?.validationRules?.[0].ruleType).toBe('pattern');
  });

  it('Mela stall (DFR + Stock Recon + Profile): stock movement columns all present per SKU', () => {
    const stock = buildArchetypeSections('STOCK_RECONCILIATION', skus);
    const questions = stock.flatMap((s) => s.questions);
    // Per SKU: opening, received, sold qty, invoice amt, scheme qty, scheme value, sampled,
    // damaged (zero-default, spec §22), actual closing — 9 bound questions each.
    for (const sku of skus) {
      const bound = questions.filter((q) => skuBindingOf(q.controlsJson)?.campaignSkuId === sku.id);
      expect(bound).toHaveLength(9);
      const types = bound.map((q) => skuBindingOf(q.controlsJson)!.movementType).sort();
      expect(new Set(types)).toEqual(
        new Set(['OPENING_STOCK', 'RECEIVED', 'SOLD', 'FREE_SCHEME', 'SAMPLED', 'DAMAGED', 'CLOSING_STOCK_ACTUAL']),
      );
    }
    // Invoice-level identity columns.
    expect(questions.find((q) => q.label === 'Distributor name')?.fieldType).toBe('SHORT_TEXT');
    expect(questions.find((q) => q.label === 'Invoice date')?.fieldType).toBe('DATE');
  });

  it('Retail audit (Profile-only) and Enquiry/Leads: no invented columns', () => {
    // Enquiry: no SKU column-groups at all (§1.4).
    const enquiry = buildArchetypeSections('ENQUIRY_LEADS', skus);
    const questions = enquiry.flatMap((s) => s.questions);
    expect(questions.some((q) => skuBindingOf(q.controlsJson))).toBe(false);
    const temperature = questions.find((q) => q.label === 'Lead temperature');
    expect(temperature?.fieldType).toBe('DROPDOWN');
    expect(temperature?.options?.map((o) => o.value)).toEqual(['HOT', 'WARM', 'COLD']);
    // No question without a real source-column counterpart: every question carries a label and a
    // FieldType from the validated list (§4) — spot-check the whole set is non-empty and typed.
    for (const q of questions) {
      expect(q.label.length).toBeGreaterThan(0);
      expect(q.fieldType.length).toBeGreaterThan(0);
    }
  });
});

describe('§5.2 Aggregate correctness — DFR rollup equals hand-computed totals to the cent', () => {
  it('rolls three Profile records up to the exact source-sheet totals', async () => {
    const template = await formsService.create(
      fx.tenantA,
      { name: `Profile ${RUN_TAG}`, archetype: 'PROFILE' },
      fx.userAId,
    );
    const { workflowId, stageId, version } = await publishAndWireMilestone(fx.tenantA, template.id);

    // Three outlets' worth of one day's Profile data (decimal amounts on purpose).
    const rows = [
      { soapQty: 12, soapAmt: 384.5, teaQty: 3, teaAmt: 396.25 },
      { soapQty: 0, soapAmt: 0, teaQty: 5, teaAmt: 660.4 },
      { soapQty: 7, soapAmt: 224.35, teaQty: 0, teaAmt: 0 },
    ];
    for (const row of rows) {
      const activity = await newActivity(fx.tenantA, stageId, workflowId);
      await executionService.submitMilestoneResponse(fx.tenantA, activity.id, fx.userAId, {
        clientRef: `ref-${RUN_TAG}-${activitySeq++}`,
        fieldResponses: answersFor(version, {
          [`${fx.skuSoapId}|SOLD|QUANTITY`]: row.soapQty,
          [`${fx.skuSoapId}|SOLD|AMOUNT`]: row.soapAmt,
          [`${fx.skuTeaId}|SOLD|QUANTITY`]: row.teaQty,
          [`${fx.skuTeaId}|SOLD|AMOUNT`]: row.teaAmt,
        }),
      } as never);
    }

    // "To the cent" means exact integer-cents equality — comparing raw IEEE doubles would allow a
    // one-ulp drift to slip through (or fail spuriously), which is precisely what this test exists
    // to rule out.
    const cents = (v: number) => Math.round(v * 100);

    const report = await reportsService.dfr(fx.tenantA);
    expect(report.rows).toHaveLength(1); // one day × one location
    const day = report.rows[0];
    expect(day.recordCount).toBe(3); // outlets visited, including the zero-sale rows
    expect(day.cells[fx.skuSoapId].quantity).toBe(12 + 0 + 7);
    expect(cents(day.cells[fx.skuSoapId].amount)).toBe(38450 + 0 + 22435);
    expect(day.cells[fx.skuTeaId].quantity).toBe(3 + 5 + 0);
    expect(cents(day.cells[fx.skuTeaId].amount)).toBe(39625 + 66040 + 0);
    expect(day.totalQuantity).toBe(27);
    expect(cents(day.totalAmount)).toBe(166550); // 384.50 + 396.25 + 660.40 + 224.35 — to the cent
    expect(cents(report.grandTotalAmount)).toBe(166550);

    // The formula evaluator (the form's auto-computed Total columns) agrees with the rollup.
    expect(evaluateFormula('SKU_QTY_TOTAL(SOLD)', { SOLD: { quantity: 27, amount: 1665.5 } })).toBe(27);
    expect(evaluateFormula('SKU_AMOUNT_TOTAL(SOLD)', { SOLD: { quantity: 27, amount: 1665.5 } })).toBe(1665.5);
  });
});

describe('§5.3 Stock reconciliation — spec §22 formula + exception on mismatch', () => {
  it('computes expected closing and raises an Exception when the physical count disagrees', async () => {
    const template = await formsService.create(
      fx.tenantA,
      { name: `Stock Recon ${RUN_TAG}`, archetype: 'STOCK_RECONCILIATION' },
      fx.userAId,
    );
    const { workflowId, stageId, version } = await publishAndWireMilestone(fx.tenantA, template.id);
    const activity = await newActivity(fx.tenantA, stageId, workflowId);

    // Soap: opening 100 + received 50 − sold 30 − sampled 5 − damaged 2 = expected 113;
    // physical count says 110 → mismatch −3 → Exception.
    await executionService.submitMilestoneResponse(fx.tenantA, activity.id, fx.userAId, {
      clientRef: `ref-${RUN_TAG}-stock`,
      fieldResponses: answersFor(version, {
        [`${fx.skuSoapId}|OPENING_STOCK|QUANTITY`]: 100,
        [`${fx.skuSoapId}|RECEIVED|QUANTITY`]: 50,
        [`${fx.skuSoapId}|SOLD|QUANTITY`]: 30,
        [`${fx.skuSoapId}|SAMPLED|QUANTITY`]: 5,
        [`${fx.skuSoapId}|DAMAGED|QUANTITY`]: 2,
        [`${fx.skuSoapId}|CLOSING_STOCK_ACTUAL|QUANTITY`]: 110,
      }),
    } as never);

    expect(expectedClosingStock({ opening: 100, received: 50, sold: 30, sampled: 5, damaged: 2 })).toBe(113);

    const recon = await reportsService.stockReconciliation(fx.tenantA);
    const soapRow = recon.find((r) => r.sku.id === fx.skuSoapId)!;
    // The Profile test already sold 19 soap in the same campaign; reconciliation sums campaign-wide.
    expect(soapRow.expectedClosing).toBe(113 - 19);
    expect(soapRow.actualClosing).toBe(110);
    expect(soapRow.mismatch).toBe(110 - (113 - 19));

    const exception = await owner.exception.findFirst({
      where: { campaignId: fx.tenantA.campaignId, category: 'STOCK_MISMATCH' },
      orderBy: { createdAt: 'desc' },
    });
    expect(exception).not.toBeNull();
    expect(exception!.triggerType).toBe('STOCK_RECONCILIATION');
    const evidence = exception!.evidenceJson as { expectedClosing: number; actualClosing: number };
    expect(evidence.actualClosing).toBe(110);
    expect(evidence.expectedClosing).toBe(113 - 19);
  });
});

describe('§5.4 Versioning survives a mid-campaign SKU change', () => {
  it('adding a SKU + syncing regenerates only the draft; the published version is untouched', async () => {
    const template = await formsService.create(
      fx.tenantA,
      { name: `Versioning ${RUN_TAG}`, archetype: 'PROFILE' },
      fx.userAId,
    );
    const published = await formsService.publish(fx.tenantA, template.id);
    const v1 = published.versions.find((v) => v.status === 'PUBLISHED')!;
    const v1QuestionIds = questionsOf(v1).map((q) => q.id).sort();
    const v1SkuBoundCount = questionsOf(v1).filter((q) => skuBindingOf(q.controlsJson)).length;

    // Mid-campaign SKU change.
    const newSku = await skusService.create(fx.tenantA, {
      skuCode: `DET-${RUN_TAG}`,
      name: 'Power Detergent',
      variantLabel: '1kg',
    });
    const synced = await formsService.syncSkuQuestions(fx.tenantA, template.id);

    // The draft (v2) now covers the new SKU…
    const v2 = synced.versions.find((v) => v.status === 'DRAFT')!;
    const v2Bindings = questionsOf(v2)
      .map((q) => skuBindingOf(q.controlsJson))
      .filter((b): b is NonNullable<typeof b> => !!b);
    expect(v2Bindings.some((b) => b.campaignSkuId === newSku.id)).toBe(true);
    expect(v2Bindings.length).toBe(v1SkuBoundCount + 2); // qty + amount for the added SKU

    // …while the published v1 is byte-for-byte the same question set (spec §10).
    const v1After = synced.versions.find((v) => v.id === v1.id)!;
    expect(v1After.status).toBe('PUBLISHED');
    expect(questionsOf(v1After).map((q) => q.id).sort()).toEqual(v1QuestionIds);
    expect(questionsOf(v1After).filter((q) => skuBindingOf(q.controlsJson)).length).toBe(v1SkuBoundCount);
    expect(
      questionsOf(v1After)
        .map((q) => skuBindingOf(q.controlsJson))
        .filter((b): b is NonNullable<typeof b> => !!b)
        .some((b) => b.campaignSkuId === newSku.id),
    ).toBe(false);
  });
});

describe('§5.5 Tenant isolation on the new SKU/movement tables', () => {
  it('cross-tenant reads return zero rows through the app role', async () => {
    // Client A has SKUs and movements from the tests above; client B must see none of them —
    // both through the service layer (tenant GUC)…
    const skusSeenByB = await skusService.findAll(fx.tenantB, true);
    expect(skusSeenByB).toHaveLength(0);
    const dfrSeenByB = await reportsService.dfr(fx.tenantB);
    expect(dfrSeenByB.rows).toHaveLength(0);
    expect(dfrSeenByB.skus).toHaveLength(0);

    // …and at the raw RLS level: same table, same connection role, only the GUC differs.
    const countAsTenant = async (clientId: string) => {
      return prismaService.runInTenantContext(clientId, async (tx) => {
        const [skuCount] = await tx.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) AS count FROM campaign_skus`;
        const [movementCount] = await tx.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) AS count FROM sku_movements`;
        return { skus: Number(skuCount.count), movements: Number(movementCount.count) };
      });
    };
    const asA = await countAsTenant(fx.tenantA.clientId);
    const asB = await countAsTenant(fx.tenantB.clientId);
    expect(asA.skus).toBeGreaterThan(0);
    expect(asA.movements).toBeGreaterThan(0);
    expect(asB.skus).toBe(0);
    expect(asB.movements).toBe(0);
  });
});
