import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DeviceService } from './device.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OTP_PROVIDER, OtpProvider } from './otp/otp-provider.interface';
import { TokenService } from './token.service';

const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly devices: DeviceService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {}

  private get isMockProvider() {
    return (process.env.OTP_PROVIDER ?? 'mock') === 'mock';
  }

  async requestOtp(dto: RequestOtpDto) {
    const countryCode = dto.countryCode ?? '+91';
    const credential = await this.prisma.mobileCredential.findUnique({
      where: { countryCode_mobileNumber: { countryCode, mobileNumber: dto.mobileNumber } },
      include: { user: true },
    });
    if (!credential || credential.user.status === 'BLOCKED') {
      // Deliberately specific: this is a closed, admin-provisioned system (spec §9.3), not public
      // self-signup, so there is no enumeration concern worth trading away a clear error for.
      throw new NotFoundException('This mobile number is not registered on Impact Field Command.');
    }

    const code = this.generateCode();
    const codeHash = await argon2.hash(code);
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? '300');

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        countryCode,
        mobileNumber: dto.mobileNumber,
        codeHash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    await this.otpProvider.send(countryCode, dto.mobileNumber, code);

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      otpProvider: this.otpProvider.name,
      // MOCK ONLY: the code is echoed here so a developer/founder can log in without any SMS
      // gateway. Never present when OTP_PROVIDER is anything other than "mock".
      ...(this.isMockProvider ? { devOtpCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, ip?: string, userAgent?: string) {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: dto.challengeId } });
    if (!challenge) throw new NotFoundException('OTP challenge not found');
    if (challenge.consumedAt) throw new BadRequestException('This OTP has already been used');
    if (challenge.expiresAt < new Date()) throw new BadRequestException('This OTP has expired');
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new ForbiddenException('Too many incorrect attempts');

    const matches = await argon2.verify(challenge.codeHash, dto.code);
    if (!matches) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect OTP code');
    }

    await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

    const credential = await this.prisma.mobileCredential.findUnique({
      where: { countryCode_mobileNumber: { countryCode: challenge.countryCode, mobileNumber: challenge.mobileNumber } },
      include: { user: true },
    });
    if (!credential || credential.user.status === 'BLOCKED') {
      throw new ForbiddenException('This account is blocked. Contact your administrator.');
    }

    const device = await this.devices.resolveForLogin(credential.user.id, dto.device);
    const tokenPair = await this.tokens.issueForNewSession(credential.user.id, device.id, ip, userAgent);

    await this.prisma.user.update({ where: { id: credential.user.id }, data: { lastLoginAt: new Date() } });

    return {
      ...tokenPair,
      user: {
        id: credential.user.id,
        fullName: credential.user.fullName,
        preferredLanguage: credential.user.preferredLanguage,
      },
      device: { id: device.id, status: device.status },
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    return this.tokens.rotate(refreshToken, ip, userAgent);
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
    return { success: true };
  }

  private generateCode(): string {
    const length = Number(process.env.OTP_CODE_LENGTH ?? '6');
    const max = 10 ** length;
    const code = Math.floor(Math.random() * max)
      .toString()
      .padStart(length, '0');
    return code;
  }
}
