// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TreasuryService } from '../treasury/treasury.service';
import { EmailService } from '../email/email.service';
import { EmailNotificationsService } from '../email/email-notifications.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomInt, randomBytes } from 'crypto';
import { resolveIndustryLabels, INDUSTRY_TEMPLATES } from '../common/industry-templates';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private treasury: TreasuryService,
    private email: EmailService,
    private emailNotify: EmailNotificationsService,
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

    const firstName = dto.name.trim().split(/\s+/)[0] ?? dto.name;
    this.emailNotify.notifyMerchant(org.id, 'welcome', {
      firstName,
      dashboardUrl: this.emailNotify.dashboardUrl('/onboarding'),
    });
    this.emailNotify.notifyMerchant(org.id, 'getting-started', {
      dashboardUrl: this.emailNotify.dashboardUrl('/onboarding'),
    });
    this.sendVerifyEmail(user);

    return { ...this.issueAuthTokens(user, org), user: this.safeUser(user), org };
  }

  async verifyEmail(token: string) {
    const payload = this.verifySignedToken(token, 'verify-email');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) throw new BadRequestException('Invalid or expired verification link');

    return {
      verified: true,
      email: user.email,
      user: this.safeUser(user),
      org: user.organization,
    };
  }

  async resendVerifyEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      return { sent: true };
    }
    this.sendVerifyEmail(user);
    return { sent: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) return { sent: true };

    const token = jwt.sign(
      { sub: user.id, type: 'password-reset', nonce: randomBytes(8).toString('hex') },
      this.otpSecret(),
      { expiresIn: '30m' },
    );
    const resetUrl = `${this.emailNotify.dashboardUrl('/auth/reset-password')}?token=${encodeURIComponent(token)}`;

    this.emailNotify.notifyAddress(user.email, 'password-reset', { resetUrl }, '/auth');
    return { sent: true };
  }

  async resetPassword(dto: { token: string; password: string }) {
    const payload = this.verifySignedToken(dto.token, 'password-reset');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new BadRequestException('Invalid or expired reset link');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });

    this.emailNotify.notifyAddress(user.email, 'password-changed', {
      time: new Date().toISOString(),
      device: 'Web browser',
    }, '/auth');

    return { reset: true };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });

    this.emailNotify.notifyAddress(user.email, 'password-changed', {
      time: new Date().toISOString(),
      device: 'Web browser',
    }, '/dashboard');

    return { changed: true };
  }

  private sendVerifyEmail(user: { id: string; email: string }) {
    const token = jwt.sign(
      { sub: user.id, type: 'verify-email' },
      this.otpSecret(),
      { expiresIn: '24h' },
    );
    const verifyUrl = `${this.emailNotify.dashboardUrl('/auth/verify-email')}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
    this.emailNotify.notifyAddress(user.email, 'verify-email', { verifyUrl }, '/dashboard');
  }

  private sendNewLoginAlert(email: string) {
    this.emailNotify.notifyAddress(
      email,
      'new-login',
      {
        device: 'Web browser',
        location: 'Nigeria',
        time: new Date().toISOString(),
      },
      '/dashboard',
    );
  }

  private verifySignedToken(token: string, type: string): { sub: string } {
    if (!token?.trim()) throw new BadRequestException('Token is required');
    try {
      const payload = jwt.verify(token, this.otpSecret()) as { sub?: string; type?: string };
      if (payload.type !== type || !payload.sub) {
        throw new BadRequestException('Invalid or expired link');
      }
      return { sub: payload.sub };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid or expired link');
    }
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

    if (this.isOtpEnabled()) {
      return this.startOtpChallenge(user, user.organization);
    }

    this.sendNewLoginAlert(user.email);
    return {
      ...this.issueAuthTokens(user, user.organization),
      user: this.safeUser(user),
      org: user.organization,
    };
  }

  async verifyOtp(dto: { otpSession: string; code: string }) {
    const payload = this.verifyOtpSession(dto.otpSession);
    const submitted = dto.code.replace(/\s/g, '');
    if (payload.code !== submitted) {
      throw new UnauthorizedException('That code didn’t match. Try again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) throw new UnauthorizedException('Session expired — please sign in again');

    this.sendNewLoginAlert(user.email);
    return {
      ...this.issueAuthTokens(user, user.organization),
      user: this.safeUser(user),
      org: user.organization,
    };
  }

  async resendOtp(dto: { otpSession: string }) {
    const payload = this.verifyOtpSession(dto.otpSession);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) throw new UnauthorizedException('Session expired — please sign in again');

    return this.startOtpChallenge(user, user.organization);
  }

  private isOtpEnabled(): boolean {
    return this.config.get<string>('AUTH_OTP_ENABLED', 'true') !== 'false';
  }

  private otpSecret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
  }

  private verifyOtpSession(token: string): { sub: string; code: string; type: string } {
    if (!token?.trim()) {
      throw new BadRequestException('OTP session is required');
    }
    try {
      const payload = jwt.verify(token, this.otpSecret()) as {
        sub?: string;
        code?: string;
        type?: string;
      };
      if (payload.type !== 'otp' || !payload.sub || !payload.code) {
        throw new UnauthorizedException('Session expired — please sign in again');
      }
      return { sub: payload.sub, code: payload.code, type: payload.type };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Session expired — please sign in again');
    }
  }

  private async startOtpChallenge(
    user: { id: string; email: string; name: string },
    org: { id: string },
  ) {
    const code = String(randomInt(100_000, 1_000_000));
    const otpSession = jwt.sign(
      { sub: user.id, code, type: 'otp' },
      this.otpSecret(),
      { expiresIn: '10m' },
    );

    if (this.email.isConfigured()) {
      await this.email.sendTemplate(user.email, 'otp-code', {
        otpCode: code.split('').join(' '),
      });
    } else {
      this.logger.warn(`OTP for ${user.email}: ${code} (RESEND_API_KEY not set)`);
    }

    return {
      requiresOtp: true as const,
      otpSession,
      maskedEmail: this.email.maskEmailForDisplay(user.email),
    };
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Session expired — please sign in again');
    }

    let payload: { sub?: string; type?: string };
    try {
      payload = jwt.verify(
        refreshToken,
        this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-change-me'),
      ) as { sub?: string; type?: string };
    } catch {
      throw new UnauthorizedException('Session expired — please sign in again');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Session expired — please sign in again');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user) throw new UnauthorizedException('Session expired — please sign in again');

    return this.issueAuthTokens(user, user.organization);
  }

  private issueAuthTokens(user: { id: string; email: string; role: string }, org: { id: string }) {
    return {
      token: this.signAccessToken(user, org),
      refreshToken: this.signRefreshToken(user),
    };
  }

  private signAccessToken(user: { id: string; email: string; role: string }, org: { id: string }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      organizationId: org.id,
      role: user.role,
    });
  }

  private signRefreshToken(user: { id: string }) {
    return jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-change-me'),
      { expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') },
    );
  }

  private signToken(user: any, org: any) {
    return this.signAccessToken(user, org);
  }

  private safeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
