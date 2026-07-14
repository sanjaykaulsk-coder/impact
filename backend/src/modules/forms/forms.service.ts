import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import { UpsertDraftFormDto } from './dto/upsert-draft-form.dto';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.formTemplate.findMany({
        where: { campaignId: tenant.campaignId },
        orderBy: { createdAt: 'desc' },
        include: { versions: { orderBy: { version: 'desc' }, select: { id: true, version: true, status: true } } },
      }),
    );
  }

  /**
   * Creates the template plus its first version — a template with zero versions is never a valid
   * state a caller can observe, so version 1 is created in the same transaction, not as a
   * separate "add a version" step.
   */
  async create(tenant: TenantContext, dto: CreateFormTemplateDto, createdById: string) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.formTemplate.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          name: dto.name,
          code: `${tenant.campaignId}-${dto.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 90) + '-' + Date.now().toString(36),
          description: dto.description,
          versions: { create: { version: 1, status: 'DRAFT', createdById } },
        },
        include: { versions: true },
      }),
    );
  }

  /**
   * Loads the full template tree using an *already-open* transaction client. Deliberately not a
   * standalone `findOne` that opens its own transaction — Prisma's `$transaction(...)` reserves
   * its own connection, so calling it again from inside another still-open transaction runs on a
   * second connection that cannot see the first transaction's uncommitted writes (plain Postgres
   * MVCC, not a Prisma quirk). `upsertDraft` and `publish` both need to return the freshly-written
   * tree *within* their own transaction, so they call this helper with their own `tx`, never
   * `findOne`.
   */
  private async loadTemplateTree(tx: Prisma.TransactionClient, campaignId: string, templateId: string) {
    const template = await tx.formTemplate.findFirst({
      where: { id: templateId, campaignId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } },
            },
            conditionalRules: true,
          },
        },
      },
    });
    if (!template) throw new NotFoundException('Form template not found');
    return template;
  }

  async findOne(tenant: TenantContext, templateId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      this.loadTemplateTree(tx, tenant.campaignId, templateId),
    );
  }

  async update(tenant: TenantContext, templateId: string, dto: UpdateFormTemplateDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.formTemplate.findFirst({ where: { id: templateId, campaignId: tenant.campaignId } });
      if (!existing) throw new NotFoundException('Form template not found');
      return tx.formTemplate.update({
        where: { id: templateId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
      });
    });
  }

  /**
   * Replaces the entire DRAFT version's tree in one shot (delete + recreate) rather than exposing
   * granular per-question CRUD endpoints — the minimal builder scope for this session. Safe
   * because a DRAFT version is by definition never referenced by a FormResponse yet (only
   * PUBLISHED versions are — spec §10's "publishing freezes a version forever").
   */
  async upsertDraft(tenant: TenantContext, templateId: string, dto: UpsertDraftFormDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const template = await tx.formTemplate.findFirst({ where: { id: templateId, campaignId: tenant.campaignId } });
      if (!template) throw new NotFoundException('Form template not found');

      const draft = await tx.formVersion.findFirst({ where: { formTemplateId: templateId, status: 'DRAFT' } });
      if (!draft) throw new BadRequestException('No draft version to edit — publish the current draft to start a new one');

      // Cascades: FormSection -> FormQuestion -> {QuestionOption, ValidationRule, ConditionalRule}.
      await tx.formSection.deleteMany({ where: { formVersionId: draft.id } });

      const keyToQuestionId = new Map<string, string>();
      for (const section of dto.sections) {
        const createdSection = await tx.formSection.create({
          data: { formVersionId: draft.id, title: section.title, order: section.order },
        });
        for (const question of section.questions) {
          const createdQuestion = await tx.formQuestion.create({
            data: {
              formSectionId: createdSection.id,
              fieldType: question.fieldType,
              label: question.label,
              helpText: question.helpText,
              order: question.order,
              isMandatory: question.isMandatory,
              controlsJson: (question.controlsJson ?? {}) as Prisma.InputJsonValue,
              options: question.options
                ? { create: question.options.map((o) => ({ label: o.label, value: o.value, order: o.order })) }
                : undefined,
            },
          });
          keyToQuestionId.set(question.key, createdQuestion.id);
        }
      }

      for (const rule of dto.conditionalRules ?? []) {
        const triggerQuestionId = keyToQuestionId.get(rule.triggerQuestionKey);
        const targetQuestionId = keyToQuestionId.get(rule.targetQuestionKey);
        if (!triggerQuestionId || !targetQuestionId) {
          throw new BadRequestException('Conditional rule references a question key not present in this draft');
        }
        await tx.conditionalRule.create({
          data: {
            formVersionId: draft.id,
            triggerQuestionId,
            triggerValueJson: rule.triggerValueJson as Prisma.InputJsonValue,
            action: rule.action,
            targetQuestionId,
          },
        });
      }

      return this.loadTemplateTree(tx, tenant.campaignId, templateId);
    });
  }

  /**
   * Publishing freezes the current draft (spec §10) and immediately opens the next draft as a
   * clone of what was just published, so the builder always has exactly one editable draft and
   * the founder never has to explicitly "create version 2" — a fresh field to tweak just appears.
   */
  async publish(tenant: TenantContext, templateId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const template = await tx.formTemplate.findFirst({ where: { id: templateId, campaignId: tenant.campaignId } });
      if (!template) throw new NotFoundException('Form template not found');

      const draft = await tx.formVersion.findFirst({
        where: { formTemplateId: templateId, status: 'DRAFT' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } },
          },
          conditionalRules: true,
        },
      });
      if (!draft) throw new BadRequestException('No draft version to publish');
      if (draft.sections.length === 0) {
        throw new BadRequestException('Cannot publish a form with no sections');
      }

      await tx.formVersion.update({ where: { id: draft.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });

      const newDraft = await tx.formVersion.create({
        data: { formTemplateId: templateId, version: draft.version + 1, status: 'DRAFT', createdById: draft.createdById },
      });

      const oldToNewQuestionId = new Map<string, string>();
      for (const section of draft.sections) {
        const newSection = await tx.formSection.create({
          data: { formVersionId: newDraft.id, title: section.title, order: section.order },
        });
        for (const question of section.questions) {
          const newQuestion = await tx.formQuestion.create({
            data: {
              formSectionId: newSection.id,
              fieldType: question.fieldType,
              label: question.label,
              helpText: question.helpText,
              order: question.order,
              isMandatory: question.isMandatory,
              controlsJson: question.controlsJson as Prisma.InputJsonValue,
              options: question.options.length
                ? { create: question.options.map((o) => ({ label: o.label, value: o.value, order: o.order })) }
                : undefined,
            },
          });
          oldToNewQuestionId.set(question.id, newQuestion.id);
        }
      }
      for (const rule of draft.conditionalRules) {
        const triggerQuestionId = oldToNewQuestionId.get(rule.triggerQuestionId);
        const targetQuestionId = oldToNewQuestionId.get(rule.targetQuestionId);
        if (!triggerQuestionId || !targetQuestionId) continue;
        await tx.conditionalRule.create({
          data: {
            formVersionId: newDraft.id,
            triggerQuestionId,
            triggerValueJson: rule.triggerValueJson as Prisma.InputJsonValue,
            action: rule.action,
            targetQuestionId,
          },
        });
      }

      return this.loadTemplateTree(tx, tenant.campaignId, templateId);
    });
  }
}
