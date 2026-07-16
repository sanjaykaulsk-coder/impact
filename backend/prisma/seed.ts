/**
 * Demo data seed (spec §41): realistic Indian demonstration data, clearly fictional, no real
 * phone numbers. Mobile numbers use a deliberately sequential, obviously-synthetic 90000000xx
 * block rather than anything resembling a real subscriber range.
 *
 * Idempotent: every create is keyed off a unique code/field, so re-running `prisma:seed` after a
 * schema change updates rather than duplicates.
 *
 * Scope note: Phase C seeded only clients, campaigns, geographies, users, roles and campaign
 * branding (no feature modules existed yet). Stage 2 Session A added platform-level clients/
 * campaigns CRUD (no new seed data needed — the web UI creates those directly). Stage 2 Session B
 * (the field thread) adds one minimal, hand-seeded workflow for the Bihar Van campaign — one
 * ActivityType, one CampaignActivity, one Workflow/WorkflowStage/Milestone, one published form,
 * one PJP + row, one assignment — so the field app has a real end-to-end thread to run without the
 * founder configuring anything first. This is deliberately NOT the general-purpose workflow/
 * milestone builder (that's still Stage 3.2, unbuilt); it's a single fixed path, same spirit as
 * A-024's decision to keep the Session A form builder to core field types only.
 */
import { PrismaClient, GeographyLevel } from '@prisma/client';

// Seed connects directly with the migration-owner DATABASE_URL, not the RLS-restricted
// APP_DATABASE_URL — seeding legitimately writes across every tenant and must not be blocked by
// the same Row-Level Security that protects runtime queries.
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const PERMISSIONS: { code: string; category: string; description: string }[] = [
  { code: 'view', category: 'general', description: 'View records within assigned scope' },
  { code: 'create', category: 'general', description: 'Create new records' },
  { code: 'edit', category: 'general', description: 'Edit existing records' },
  { code: 'allocate', category: 'general', description: 'Allocate users, teams or resources' },
  { code: 'approve', category: 'general', description: 'Approve a pending request' },
  { code: 'reject', category: 'general', description: 'Reject a pending request' },
  { code: 'download', category: 'general', description: 'Download reports or media' },
  { code: 'export', category: 'general', description: 'Export data out of the platform' },
  { code: 'block', category: 'general', description: 'Block a user or device' },
  { code: 'delete', category: 'general', description: 'Delete records' },
  { code: 'audit', category: 'general', description: 'View audit logs' },
  { code: 'view_original_photographs', category: 'media', description: 'View unwatermarked original media' },
  { code: 'view_reports', category: 'reporting', description: 'View reports and dashboards' },
  { code: 'view_raw_data', category: 'reporting', description: 'View raw (non-aggregated) data' },
  { code: 'view_assigned_geography', category: 'reporting', description: 'View only assigned geography' },
  { code: 'view_financial_information', category: 'reporting', description: 'View financial/cost data' },
  { code: 'manage_users', category: 'admin', description: 'Create/edit/block users' },
  { code: 'manage_forms', category: 'admin', description: 'Create/edit/publish forms' },
  { code: 'manage_pjp', category: 'admin', description: 'Upload/edit PJP and routes' },
  { code: 'manage_clients', category: 'admin', description: 'Create/edit clients' },
  {
    code: 'platform.cross_tenant_access',
    category: 'platform',
    description: 'Deliberate cross-tenant access for platform staff (gates the Postgres RLS bypass flag)',
  },
];

const ALL = PERMISSIONS.map((p) => p.code);
const ALL_EXCEPT = (...exclude: string[]) => ALL.filter((c) => !exclude.includes(c));

interface RoleSeed {
  code: string;
  name: string;
  category: 'Platform' | 'Management' | 'Field' | 'Client';
  permissions: string[];
}

const ROLES: RoleSeed[] = [
  // Platform
  { code: 'super_admin', name: 'Super Admin', category: 'Platform', permissions: ALL },
  {
    code: 'impact_system_administrator',
    name: 'Impact System Administrator',
    category: 'Platform',
    permissions: ALL_EXCEPT('platform.cross_tenant_access').concat('platform.cross_tenant_access'),
  },
  {
    code: 'data_administrator',
    name: 'Data Administrator',
    category: 'Platform',
    permissions: ['view', 'edit', 'export', 'manage_forms', 'manage_pjp', 'view_reports', 'view_raw_data'],
  },
  {
    code: 'auditor',
    name: 'Auditor',
    category: 'Platform',
    permissions: ['view', 'audit', 'view_reports', 'view_raw_data', 'view_original_photographs'],
  },
  // Management
  {
    code: 'operations_director',
    name: 'Operations Director',
    category: 'Management',
    permissions: [
      'view', 'approve', 'reject', 'view_reports', 'view_raw_data', 'view_financial_information',
      'export', 'audit',
    ],
  },
  {
    code: 'national_operations_head',
    name: 'National Operations Head',
    category: 'Management',
    permissions: ['view', 'approve', 'reject', 'view_reports', 'view_raw_data', 'view_financial_information', 'export'],
  },
  {
    code: 'regional_operations_head',
    name: 'Regional Operations Head',
    category: 'Management',
    permissions: ['view', 'approve', 'reject', 'view_reports', 'view_assigned_geography', 'export'],
  },
  {
    code: 'client_servicing_director',
    name: 'Client Servicing Director',
    category: 'Management',
    permissions: ['view', 'approve', 'view_reports', 'export', 'download'],
  },
  {
    code: 'client_servicing_manager',
    name: 'Client Servicing Manager',
    category: 'Management',
    permissions: ['view', 'view_reports', 'download', 'view_assigned_geography'],
  },
  {
    code: 'campaign_manager',
    name: 'Campaign Manager',
    category: 'Management',
    permissions: ['view', 'create', 'edit', 'allocate', 'manage_pjp', 'manage_forms', 'view_reports'],
  },
  {
    code: 'activity_spoke',
    name: 'Activity Spoke',
    category: 'Management',
    permissions: ['view', 'approve', 'reject', 'view_reports', 'view_assigned_geography'],
  },
  {
    code: 'project_manager',
    name: 'Project Manager',
    category: 'Management',
    permissions: ['view', 'create', 'edit', 'allocate', 'view_reports'],
  },
  // Field
  {
    code: 'activity_supervisor',
    name: 'Activity Supervisor',
    category: 'Field',
    permissions: ['view', 'approve', 'reject', 'view_reports', 'view_assigned_geography'],
  },
  {
    code: 'field_supervisor',
    name: 'Field Supervisor',
    category: 'Field',
    permissions: ['view', 'approve', 'view_assigned_geography'],
  },
  { code: 'promoter', name: 'Promoter', category: 'Field', permissions: ['view', 'create', 'view_assigned_geography'] },
  {
    code: 'field_executive',
    name: 'Field Executive',
    category: 'Field',
    permissions: ['view', 'create', 'view_assigned_geography'],
  },
  { code: 'vendor', name: 'Vendor', category: 'Field', permissions: ['view', 'create'] },
  { code: 'vehicle_driver', name: 'Vehicle Driver', category: 'Field', permissions: ['view'] },
  {
    code: 'field_auditor',
    name: 'Field Auditor',
    category: 'Field',
    permissions: ['view', 'audit', 'view_assigned_geography'],
  },
  // Client
  {
    code: 'client_administrator',
    name: 'Client Administrator',
    category: 'Client',
    permissions: ['view', 'view_reports', 'download', 'manage_users'],
  },
  {
    code: 'client_campaign_manager',
    name: 'Client Campaign Manager',
    category: 'Client',
    permissions: ['view', 'view_reports', 'download'],
  },
  { code: 'client_viewer', name: 'Client Viewer', category: 'Client', permissions: ['view', 'view_reports'] },
  {
    code: 'client_auditor',
    name: 'Client Auditor',
    category: 'Client',
    permissions: ['view', 'audit', 'view_reports'],
  },
];

async function seedRbac() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }
}

async function seedRoles(organisationId: string) {
  const roleIdByCode = new Map<string, string>();
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, category: r.category },
      create: { organisationId, code: r.code, name: r.name, category: r.category, isSystem: true },
    });
    roleIdByCode.set(r.code, role.id);

    const permissionRows = await prisma.permission.findMany({ where: { code: { in: r.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  return roleIdByCode;
}

interface GeoNode {
  state: string;
  region: string;
  district: string;
  tehsil: string;
}

async function seedGeography(node: GeoNode) {
  const state = await prisma.geography.upsert({
    where: { id: geoDeterministicId('STATE', node.state) },
    update: {},
    create: { id: geoDeterministicId('STATE', node.state), level: GeographyLevel.STATE, name: node.state },
  });
  const region = await prisma.geography.upsert({
    where: { id: geoDeterministicId('REGION', node.state, node.region) },
    update: {},
    create: {
      id: geoDeterministicId('REGION', node.state, node.region),
      level: GeographyLevel.REGION,
      name: node.region,
      parentId: state.id,
    },
  });
  const district = await prisma.geography.upsert({
    where: { id: geoDeterministicId('DISTRICT', node.state, node.region, node.district) },
    update: {},
    create: {
      id: geoDeterministicId('DISTRICT', node.state, node.region, node.district),
      level: GeographyLevel.DISTRICT,
      name: node.district,
      parentId: region.id,
    },
  });
  const tehsil = await prisma.geography.upsert({
    where: { id: geoDeterministicId('TEHSIL', node.state, node.region, node.district, node.tehsil) },
    update: {},
    create: {
      id: geoDeterministicId('TEHSIL', node.state, node.region, node.district, node.tehsil),
      level: GeographyLevel.TEHSIL,
      name: node.tehsil,
      parentId: district.id,
    },
  });
  return { state, region, district, tehsil };
}

// Deterministic UUID v5-style stand-in: Geography rows are looked up by a stable synthetic id so
// re-running the seed is idempotent without needing a separate unique(name, parentId) constraint.
import { createHash } from 'node:crypto';
function geoDeterministicId(...parts: string[]): string {
  const hash = createHash('sha1').update(parts.join('|')).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), '5' + hash.slice(13, 16), '8' + hash.slice(17, 20), hash.slice(20, 32)].join(
    '-',
  );
}

async function main() {
  console.log('Seeding IMPACT FIELD COMMAND demo data...');

  const organisation = await prisma.organisation.upsert({
    where: { code: 'IMPACT' },
    update: {},
    create: { name: 'Impact Communications', code: 'IMPACT' },
  });

  await seedRbac();
  const roleIdByCode = await seedRoles(organisation.id);

  // -- Clients (spec §41) --------------------------------------------------------------------
  const shakti = await prisma.client.upsert({
    where: { code: 'SHAKTI' },
    update: {},
    create: {
      organisationId: organisation.id,
      name: 'Shakti Consumer Products',
      code: 'SHAKTI',
      brandColorPrimary: '#1B5E3C',
      brandColorSecondary: '#F2A71B',
      status: 'ACTIVE',
    },
  });
  const bharatAgri = await prisma.client.upsert({
    where: { code: 'BHARATAGRI' },
    update: {},
    create: {
      organisationId: organisation.id,
      name: 'Bharat Agri Systems',
      code: 'BHARATAGRI',
      brandColorPrimary: '#7A3E1D',
      brandColorSecondary: '#4C8C2B',
      status: 'ACTIVE',
    },
  });
  const suryaHome = await prisma.client.upsert({
    where: { code: 'SURYAHOME' },
    update: {},
    create: {
      organisationId: organisation.id,
      name: 'Surya Home Care',
      code: 'SURYAHOME',
      brandColorPrimary: '#0E5FA4',
      brandColorSecondary: '#FFB100',
      status: 'ACTIVE',
    },
  });

  // -- Geography (spec §5, §41) ---------------------------------------------------------------
  const biharGeo = await seedGeography({ state: 'Bihar', region: 'Patna Division', district: 'Patna', tehsil: 'Patna Sadar' });
  const upGeo = await seedGeography({ state: 'Uttar Pradesh', region: 'Lucknow Division', district: 'Lucknow', tehsil: 'Lucknow Sadar' });
  const rajGeo = await seedGeography({ state: 'Rajasthan', region: 'Jaipur Division', district: 'Jaipur', tehsil: 'Jaipur Sadar' });
  const mahaGeo = await seedGeography({ state: 'Maharashtra', region: 'Pune Division', district: 'Pune', tehsil: 'Haveli' });

  // -- Campaigns (spec §41 examples), varied lifecycle statuses (spec §9.2) -------------------
  const campaignBihar = await prisma.campaign.upsert({
    where: { code: 'SHAKTI-BIHAR-VAN-2026' },
    update: {},
    create: {
      clientId: shakti.id,
      name: 'Bihar Rural Van Outreach',
      code: 'SHAKTI-BIHAR-VAN-2026',
      status: 'LIVE',
      reportingLanguage: 'HI',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
      deviationToleranceMeters: 250,
    },
  });
  const campaignUp = await prisma.campaign.upsert({
    where: { code: 'BHARATAGRI-UP-HAAT-2026' },
    update: {},
    create: {
      clientId: bharatAgri.id,
      name: 'Uttar Pradesh Haat Trial Programme',
      code: 'BHARATAGRI-UP-HAAT-2026',
      status: 'PUBLISHED',
      reportingLanguage: 'HI',
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-10-15'),
      deviationToleranceMeters: 500,
    },
  });
  const campaignRaj = await prisma.campaign.upsert({
    where: { code: 'SURYAHOME-RAJ-RETAIL-2026' },
    update: {},
    create: {
      clientId: suryaHome.id,
      name: 'Rajasthan Retail Branding Drive',
      code: 'SURYAHOME-RAJ-RETAIL-2026',
      status: 'CONFIGURATION_IN_PROGRESS',
      reportingLanguage: 'EN',
      startDate: new Date('2026-08-01'),
      deviationToleranceMeters: 100,
    },
  });
  const campaignMaha = await prisma.campaign.upsert({
    where: { code: 'SHAKTI-MAHA-SCHOOL-2026' },
    update: {},
    create: {
      clientId: shakti.id,
      name: 'Maharashtra School Contact Programme',
      code: 'SHAKTI-MAHA-SCHOOL-2026',
      status: 'DRAFT',
      reportingLanguage: 'EN',
      startDate: new Date('2026-09-01'),
      deviationToleranceMeters: 250,
    },
  });

  // -- Campaign branding: versioned theme document (spec §6, doc 07) --------------------------
  // No real logo/banner image assets exist for these fictional demo clients — per spec §39
  // ("neutral placeholders where brand assets unavailable") the theme carries colour tokens only
  // and leaves logoUrl/homeBannerUrl null rather than pointing at a fake image that doesn't exist.
  const brandingFor = async (campaignId: string, clientId: string, primary: string, secondary: string, instructions: string, escName: string) =>
    prisma.campaignBranding.upsert({
      where: { campaignId },
      update: {},
      create: {
        campaignId,
        clientId,
        version: 1,
        themeJson: { primaryColor: primary, secondaryColor: secondary, mode: 'neutral-placeholder' },
        instructionsText: instructions,
        escalationContactName: escName,
        escalationContactPhone: '9000099999',
        publishedAt: new Date(),
      },
    });

  await brandingFor(
    campaignBihar.id,
    shakti.id,
    '#1B5E3C',
    '#F2A71B',
    'Report every van stop with an opening photo before starting demonstrations.',
    'Karan Malhotra',
  );
  await brandingFor(
    campaignUp.id,
    bharatAgri.id,
    '#7A3E1D',
    '#4C8C2B',
    'Confirm haat market day before dispatch; capture stock at open and close.',
    'Meera Joshi',
  );
  await brandingFor(
    campaignRaj.id,
    suryaHome.id,
    '#0E5FA4',
    '#FFB100',
    'Retail recce requires shopkeeper consent photo before measurements.',
    'Divya Pillai',
  );
  await brandingFor(
    campaignMaha.id,
    shakti.id,
    '#1B5E3C',
    '#F2A71B',
    'School sessions require authority permission on file before setup begins.',
    'Sneha Reddy',
  );

  // -- Locations (spec §13, minimal — full PJP upload is a later feature module) --------------
  await prisma.location.upsert({
    where: { id: geoDeterministicId('LOCATION', 'Patna City Haat Ground') },
    update: {},
    create: {
      id: geoDeterministicId('LOCATION', 'Patna City Haat Ground'),
      clientId: shakti.id,
      campaignId: campaignBihar.id,
      geographyId: biharGeo.tehsil.id,
      name: 'Patna City Haat Ground',
      latitude: 25.594095,
      longitude: 85.137566,
      status: 'ACTIVE',
    },
  });
  await prisma.location.upsert({
    where: { id: geoDeterministicId('LOCATION', 'Lucknow Haat Market') },
    update: {},
    create: {
      id: geoDeterministicId('LOCATION', 'Lucknow Haat Market'),
      clientId: bharatAgri.id,
      campaignId: campaignUp.id,
      geographyId: upGeo.tehsil.id,
      name: 'Lucknow Haat Market',
      latitude: 26.846695,
      longitude: 80.946166,
      status: 'ACTIVE',
    },
  });
  await prisma.location.upsert({
    where: { id: geoDeterministicId('LOCATION', 'Jaipur MI Road Retail Cluster') },
    update: {},
    create: {
      id: geoDeterministicId('LOCATION', 'Jaipur MI Road Retail Cluster'),
      clientId: suryaHome.id,
      campaignId: campaignRaj.id,
      geographyId: rajGeo.tehsil.id,
      name: 'Jaipur MI Road Retail Cluster',
      latitude: 26.912434,
      longitude: 75.787270,
      status: 'ACTIVE',
    },
  });
  await prisma.location.upsert({
    where: { id: geoDeterministicId('LOCATION', 'Pune Zilla Parishad School') },
    update: {},
    create: {
      id: geoDeterministicId('LOCATION', 'Pune Zilla Parishad School'),
      clientId: shakti.id,
      campaignId: campaignMaha.id,
      geographyId: mahaGeo.tehsil.id,
      name: 'Pune Zilla Parishad School',
      latitude: 18.521428,
      longitude: 73.854897,
      status: 'ACTIVE',
    },
  });

  // -- Users, credentials, campaign roles (spec §7, §8, §41) -----------------------------------
  // Platform-category users are granted their role on every seeded campaign as a seed-level
  // workaround for the schema gap logged as ASSUMPTIONS.md A-017 (UserCampaignRole has no
  // campaign-independent "platform-wide" grant).
  const allCampaignIds = [campaignBihar.id, campaignUp.id, campaignRaj.id, campaignMaha.id];
  const campaignClientId: Record<string, string> = {
    [campaignBihar.id]: shakti.id,
    [campaignUp.id]: bharatAgri.id,
    [campaignRaj.id]: suryaHome.id,
    [campaignMaha.id]: shakti.id,
  };

  async function seedUser(fullName: string, mobileNumber: string, language: 'EN' | 'HI' = 'EN') {
    const user = await prisma.user.upsert({
      where: { id: geoDeterministicId('USER', mobileNumber) },
      update: { fullName },
      create: {
        id: geoDeterministicId('USER', mobileNumber),
        organisationId: organisation.id,
        fullName,
        preferredLanguage: language,
        status: 'ACTIVE',
      },
    });
    await prisma.mobileCredential.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, countryCode: '+91', mobileNumber, isVerified: true },
    });
    return user;
  }

  async function grantRole(userId: string, campaignId: string, roleCode: string, reportingManagerUcrId?: string) {
    const roleId = roleIdByCode.get(roleCode)!;
    return prisma.userCampaignRole.upsert({
      where: { userId_campaignId_roleId: { userId, campaignId, roleId } },
      update: {},
      create: {
        userId,
        campaignId,
        clientId: campaignClientId[campaignId],
        roleId,
        reportingManagerId: reportingManagerUcrId,
        status: 'ACTIVE',
      },
    });
  }

  // Platform
  const rohan = await seedUser('Rohan Mehta', '9000000001');
  const ananya = await seedUser('Ananya Iyer', '9000000002');
  for (const campaignId of allCampaignIds) {
    await grantRole(rohan.id, campaignId, 'super_admin');
    await grantRole(ananya.id, campaignId, 'impact_system_administrator');
  }

  // Management
  const vikram = await seedUser('Vikram Chandel', '9000000003');
  for (const campaignId of allCampaignIds) {
    await grantRole(vikram.id, campaignId, 'operations_director');
  }
  const karan = await seedUser('Karan Malhotra', '9000000005');
  await grantRole(karan.id, campaignBihar.id, 'client_servicing_manager');

  // Sneha Reddy: spec §7's headline example — different roles in different campaigns.
  const sneha = await seedUser('Sneha Reddy', '9000000006', 'HI');
  await grantRole(sneha.id, campaignBihar.id, 'campaign_manager');
  await grantRole(sneha.id, campaignMaha.id, 'activity_supervisor');

  // Field
  const arjun = await seedUser('Arjun Verma', '9000000007', 'HI');
  await grantRole(arjun.id, campaignBihar.id, 'activity_supervisor');
  const meera = await seedUser('Meera Joshi', '9000000008', 'HI');
  await grantRole(meera.id, campaignUp.id, 'field_supervisor');
  const rahul = await seedUser('Rahul Kumar', '9000000009', 'HI');
  await grantRole(rahul.id, campaignBihar.id, 'promoter');
  const neha = await seedUser('Neha Singh', '9000000010', 'HI');
  await grantRole(neha.id, campaignUp.id, 'field_executive');
  const suresh = await seedUser('Suresh Yadav', '9000000011', 'HI');
  await grantRole(suresh.id, campaignBihar.id, 'vehicle_driver');
  const divya = await seedUser('Divya Pillai', '9000000012');
  await grantRole(divya.id, campaignRaj.id, 'field_auditor');
  const amitabh = await seedUser('Amitabh Choudhary', '9000000013', 'HI');
  await grantRole(amitabh.id, campaignRaj.id, 'vendor');

  // Client
  const rajesh = await seedUser('Rajesh Agarwal', '9000000014');
  await grantRole(rajesh.id, campaignBihar.id, 'client_administrator');
  const kavita = await seedUser('Kavita Desai', '9000000015');
  await grantRole(kavita.id, campaignUp.id, 'client_viewer');
  const manoj = await seedUser('Manoj Tiwari', '9000000016');
  await grantRole(manoj.id, campaignRaj.id, 'client_campaign_manager');
  const pooja = await seedUser('Pooja Bhatt', '9000000017');
  await grantRole(pooja.id, campaignMaha.id, 'client_auditor');

  // -- Field-thread minimal workflow (Stage 2 Session B) --------------------------------------
  // One real published form, one workflow with a single milestone requiring a photo + GPS, and
  // two PJP rows + assignments (two stops on the same route), so the field app has a genuine
  // end-to-end thread to run — including a second stop for a fresh airplane-mode/offline test
  // without needing to reset an already-completed one — without the founder hand-configuring
  // anything first. Deliberately NOT the general-purpose workflow/
  // milestone builder — that stays Stage 3.2 scope, same spirit as A-024's form-builder decision.
  const patnaHaatLocationId = geoDeterministicId('LOCATION', 'Patna City Haat Ground');

  const vanActivityType = await prisma.activityType.upsert({
    where: { code: 'VAN_CAMPAIGN' },
    update: {},
    create: { name: 'Van Campaign', code: 'VAN_CAMPAIGN', description: 'Mobile van outreach with outlet visits' },
  });

  const outletVisitForm = await prisma.formTemplate.upsert({
    where: { code: 'bihar-van-outlet-visit' },
    update: {},
    create: {
      clientId: shakti.id,
      campaignId: campaignBihar.id,
      name: 'Outlet Visit',
      code: 'bihar-van-outlet-visit',
      description: 'Milestone form captured at each Van campaign outlet stop',
    },
  });
  const outletVisitVersion = await prisma.formVersion.upsert({
    where: { formTemplateId_version: { formTemplateId: outletVisitForm.id, version: 1 } },
    update: {},
    create: {
      formTemplateId: outletVisitForm.id,
      version: 1,
      status: 'PUBLISHED',
      createdById: rohan.id,
      publishedAt: new Date(),
    },
  });

  // Form content is static once seeded — only build it the first time this version has no
  // sections yet, so re-running the seed never duplicates questions.
  const hasSections = await prisma.formSection.findFirst({ where: { formVersionId: outletVisitVersion.id } });
  if (!hasSections) {
    const section = await prisma.formSection.create({
      data: { formVersionId: outletVisitVersion.id, title: 'Outlet Details', order: 0 },
    });
    await prisma.formQuestion.create({
      data: { formSectionId: section.id, fieldType: 'SHORT_TEXT', label: 'Outlet name', order: 0, isMandatory: true },
    });
    const conducted = await prisma.formQuestion.create({
      data: {
        formSectionId: section.id,
        fieldType: 'YES_NO',
        label: 'Was the activity conducted?',
        order: 1,
        isMandatory: true,
      },
    });
    const reasonNotConducted = await prisma.formQuestion.create({
      data: {
        formSectionId: section.id,
        fieldType: 'LONG_TEXT',
        label: 'Reason not conducted',
        order: 2,
        isMandatory: false,
      },
    });
    const outletType = await prisma.formQuestion.create({
      data: { formSectionId: section.id, fieldType: 'DROPDOWN', label: 'Outlet type', order: 3, isMandatory: true },
    });
    await prisma.questionOption.createMany({
      data: [
        { formQuestionId: outletType.id, label: 'Kirana', value: 'kirana', order: 0 },
        { formQuestionId: outletType.id, label: 'Chemist', value: 'chemist', order: 1 },
        { formQuestionId: outletType.id, label: 'General Store', value: 'general_store', order: 2 },
      ],
    });
    await prisma.conditionalRule.create({
      data: {
        formVersionId: outletVisitVersion.id,
        triggerQuestionId: conducted.id,
        triggerValueJson: false,
        action: 'SHOW',
        targetQuestionId: reasonNotConducted.id,
      },
    });
  }

  const vanWorkflow = await prisma.workflow.upsert({
    where: { id: geoDeterministicId('WORKFLOW', 'Bihar Van Workflow') },
    update: {},
    create: {
      id: geoDeterministicId('WORKFLOW', 'Bihar Van Workflow'),
      campaignId: campaignBihar.id,
      name: 'Bihar Van Outlet Visit Workflow',
    },
  });
  const vanStage = await prisma.workflowStage.upsert({
    where: { workflowId_order: { workflowId: vanWorkflow.id, order: 0 } },
    update: {},
    create: { workflowId: vanWorkflow.id, name: 'Outlet Visit', order: 0, allowIncompletePreparation: true },
  });
  await prisma.milestone.upsert({
    where: { workflowStageId_order: { workflowStageId: vanStage.id, order: 0 } },
    update: {},
    create: {
      workflowStageId: vanStage.id,
      name: 'Opening evidence + outlet form',
      order: 0,
      formVersionId: outletVisitVersion.id,
      mandatoryPhotoCount: 1,
      mandatoryGps: true,
      mandatorySignature: false,
    },
  });

  await prisma.campaignActivity.upsert({
    where: { id: geoDeterministicId('CAMPAIGN_ACTIVITY', 'Bihar Van Outlet Visit') },
    update: {},
    create: {
      id: geoDeterministicId('CAMPAIGN_ACTIVITY', 'Bihar Van Outlet Visit'),
      campaignId: campaignBihar.id,
      activityTypeId: vanActivityType.id,
      name: 'Bihar Van Outlet Visit',
      configJson: { workflowId: vanWorkflow.id },
    },
  });

  // A published PJP with one row today's field worker can actually pick up, plus the assignment
  // linking Rahul Kumar (Promoter, seeded above) to it.
  const vanPjp = await prisma.pJP.upsert({
    where: { id: geoDeterministicId('PJP', 'Bihar Van Seed Route') },
    update: {},
    create: {
      id: geoDeterministicId('PJP', 'Bihar Van Seed Route'),
      campaignId: campaignBihar.id,
      fileName: 'Seed data — Bihar Van route',
      uploadedById: rohan.id,
      status: 'PUBLISHED',
      totalRows: 1,
      invalidRows: 0,
      publishedAt: new Date(),
    },
  });
  const vanPjpRow = await prisma.pJPRow.upsert({
    where: { id: geoDeterministicId('PJP_ROW', 'Bihar Van Seed Route', 'Patna Haat Ground') },
    update: {},
    create: {
      id: geoDeterministicId('PJP_ROW', 'Bihar Van Seed Route', 'Patna Haat Ground'),
      pjpId: vanPjp.id,
      campaignId: campaignBihar.id,
      date: new Date(),
      stateName: 'Bihar',
      districtName: 'Patna',
      tehsilName: 'Patna Sadar',
      locationName: 'Patna City Haat Ground',
      locationId: patnaHaatLocationId,
      latitude: 25.594095,
      longitude: 85.137566,
      status: 'ACTIVE',
    },
  });
  await prisma.userAssignment.upsert({
    where: { id: geoDeterministicId('ASSIGNMENT', 'Rahul Bihar Van Seed') },
    update: {},
    create: {
      id: geoDeterministicId('ASSIGNMENT', 'Rahul Bihar Van Seed'),
      campaignId: campaignBihar.id,
      clientId: shakti.id,
      userId: rahul.id,
      pjpRowId: vanPjpRow.id,
      assignedById: rohan.id,
      assignmentDate: new Date(),
      status: 'ASSIGNED',
    },
  });

  // A second stop on the same route — real field days visit more than one location, and a real
  // second assignment (not a reset of the first) is what let the founder run the airplane-mode
  // test without touching the already-completed Patna City Haat Ground activity.
  const danapurLocationId = geoDeterministicId('LOCATION', 'Danapur Cantt Market');
  const danapurPjpRow = await prisma.pJPRow.upsert({
    where: { id: geoDeterministicId('PJP_ROW', 'Bihar Van Seed Route', 'Danapur Cantt Market') },
    update: {},
    create: {
      id: geoDeterministicId('PJP_ROW', 'Bihar Van Seed Route', 'Danapur Cantt Market'),
      pjpId: vanPjp.id,
      campaignId: campaignBihar.id,
      date: new Date(),
      stateName: 'Bihar',
      districtName: 'Patna',
      tehsilName: 'Danapur',
      locationName: 'Danapur Cantt Market',
      locationId: danapurLocationId,
      latitude: 25.632519,
      longitude: 85.045538,
      status: 'ACTIVE',
    },
  });
  await prisma.userAssignment.upsert({
    where: { id: geoDeterministicId('ASSIGNMENT', 'Rahul Bihar Van Seed Danapur') },
    update: {},
    create: {
      id: geoDeterministicId('ASSIGNMENT', 'Rahul Bihar Van Seed Danapur'),
      campaignId: campaignBihar.id,
      clientId: shakti.id,
      userId: rahul.id,
      pjpRowId: danapurPjpRow.id,
      assignedById: rohan.id,
      assignmentDate: new Date(),
      status: 'ASSIGNED',
    },
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Demo login numbers (MOCK OTP — code is echoed by the API, never a real SMS):');
  console.log('  9000000001  Rohan Mehta          Super Admin (all campaigns)');
  console.log('  9000000006  Sneha Reddy          Campaign Manager (Bihar) / Activity Supervisor (Maharashtra)');
  console.log('  9000000007  Arjun Verma          Activity Supervisor (Bihar)');
  console.log('  9000000009  Rahul Kumar          Promoter (Bihar)');
  console.log('  9000000014  Rajesh Agarwal       Client Administrator (Shakti Consumer Products)');
  console.log('  ...see docs/STATE.md for the full list.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
