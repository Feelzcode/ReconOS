// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TreasuryService } from '../treasury/treasury.service';
import * as bcrypt from 'bcryptjs';
import { resolveIndustryLabels, INDUSTRY_TEMPLATES } from '../common/industry-templates';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private treasury: TreasuryService,
  ) {}

  async register(dto: {
    orgName: string;
    industry?: string;
    industryTemplate?: string;
    customerLabel?: string;
    invoiceLabel?: string;
    name: string;
    email: string;
    password: string;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const org = await this.prisma.organization.create({
      data: {
        name: dto.orgName,
        email: dto.email,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId: org.id,
        name: dto.name,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: 'OWNER',
      },
    });

    // Provision Nomba sub-account in background — merchant never uses Nomba dashboard
    this.treasury.ensureSubAccount(org.id).catch((err) => {
      this.logger.warn(`Sub-account provision deferred for ${org.name}: ${err?.message ?? err}`);
    });

    return { token: this.signToken(user, org), user: this.safeUser(user), org };
  }

  listIndustryTemplates() {
    return INDUSTRY_TEMPLATES;
  }

  async setupOrganization(
    organizationId: string,
    dto: {
      industryTemplate: string;
      customerLabel?: string;
      invoiceLabel?: string;
    },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const labels = resolveIndustryLabels(dto);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        industry: labels.industry,
        industryTemplate: labels.industryTemplate,
        customerLabel: labels.customerLabel,
        invoiceLabel: labels.invoiceLabel,
      },
    });
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return {
      token: this.signToken(user, user.organization),
      user: this.safeUser(user),
      org: user.organization,
    };
  }

  private signToken(user: any, org: any) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      organizationId: org.id,
      role: user.role,
    });
  }

  private safeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
