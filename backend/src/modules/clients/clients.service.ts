import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Client Management (spec §9.1) is platform-level, not campaign-scoped — Impact staff manage
   * every client, and a brand-new client has no campaign yet to scope to. All three methods here
   * deliberately run with RLS bypassed; access is instead gated at the route level by
   * PlatformPermissionGuard checking a real permission code, never left to trust in application
   * code alone.
   */
  async create(dto: CreateClientDto) {
    return this.prisma.runWithBypass(async (tx) => {
      const organisation = await tx.organisation.findFirst();
      if (!organisation) throw new BadRequestException('No organisation record exists to attach this client to');

      const existing = await tx.client.findUnique({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Client code "${dto.code}" is already in use`);

      return tx.client.create({
        data: {
          organisationId: organisation.id,
          name: dto.name,
          code: dto.code,
          logoUrl: dto.logoUrl,
          brandColorPrimary: dto.brandColorPrimary,
          brandColorSecondary: dto.brandColorSecondary,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.runWithBypass((tx) =>
      tx.client.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { campaigns: true } } } }),
    );
  }

  async findOne(id: string) {
    const client = await this.prisma.runWithBypass((tx) =>
      tx.client.findUnique({ where: { id }, include: { _count: { select: { campaigns: true } } } }),
    );
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.runWithBypass((tx) => tx.client.update({ where: { id }, data: dto }));
  }
}
