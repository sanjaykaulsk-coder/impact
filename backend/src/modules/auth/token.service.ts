import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string; // userId
  deviceId: string;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

/**
 * JWT access tokens + rotating refresh tokens (spec §7). Refresh tokens are themselves JWTs
 * (signed with a separate secret so a leaked access-token secret can't mint refresh tokens), but
 * only their argon2 hash is stored server-side in login_sessions — so a leaked database dump
 * alone can't be replayed, and rotation is enforced by revoking the session row on every use.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private get accessSecret() {
    return process.env.JWT_ACCESS_SECRET!;
  }
  private get refreshSecret() {
    return process.env.JWT_REFRESH_SECRET!;
  }
  private get accessTtl() {
    return process.env.JWT_ACCESS_TTL ?? '15m';
  }
  private get refreshTtl() {
    return process.env.JWT_REFRESH_TTL ?? '30d';
  }

  /** Issues a brand-new session (used at login). */
  async issueForNewSession(userId: string, deviceId: string, ip?: string, userAgent?: string): Promise<TokenPair> {
    const session = await this.prisma.loginSession.create({
      data: {
        userId,
        deviceId,
        refreshTokenHash: 'pending', // replaced below once we know the token
        expiresAt: this.expiryDate(this.refreshTtl),
        ipAddress: ip,
        userAgent,
      },
    });
    return this.signPair(userId, deviceId, session.id, ip, userAgent);
  }

  /** Rotates: verifies + revokes the presented refresh token, then issues a fresh pair. */
  async rotate(refreshToken: string, ip?: string, userAgent?: string): Promise<TokenPair> {
    let payload: AccessTokenPayload;
    try {
      payload = this.jwt.verify<AccessTokenPayload>(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.loginSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session no longer valid');
    }
    const matches = await argon2.verify(session.refreshTokenHash, refreshToken);
    if (!matches) {
      // Reuse of a rotated-out token is a strong signal of theft — revoke the whole session.
      await this.prisma.loginSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }

    await this.prisma.loginSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    const newSession = await this.prisma.loginSession.create({
      data: {
        userId: payload.sub,
        deviceId: payload.deviceId,
        refreshTokenHash: 'pending',
        expiresAt: this.expiryDate(this.refreshTtl),
        ipAddress: ip,
        userAgent,
      },
    });
    return this.signPair(payload.sub, payload.deviceId, newSession.id, ip, userAgent);
  }

  async revoke(refreshToken: string): Promise<void> {
    let payload: AccessTokenPayload;
    try {
      payload = this.jwt.verify<AccessTokenPayload>(refreshToken, { secret: this.refreshSecret });
    } catch {
      return; // already invalid/expired — nothing to revoke
    }
    await this.prisma.loginSession.updateMany({
      where: { id: payload.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Remote logout / block-user support: revoke every active session for a user. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.loginSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async signPair(
    userId: string,
    deviceId: string,
    sessionId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = { sub: userId, deviceId, sessionId };
    const accessToken = this.jwt.sign(payload, { secret: this.accessSecret, expiresIn: this.accessTtl });
    const refreshToken = this.jwt.sign(payload, { secret: this.refreshSecret, expiresIn: this.refreshTtl });

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.loginSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash, ipAddress: ip, userAgent },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessTtl,
      refreshTokenExpiresIn: this.refreshTtl,
    };
  }

  private expiryDate(ttl: string): Date {
    const ms = this.parseTtlMs(ttl);
    return new Date(Date.now() + ms);
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(ttl);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
    return value * unitMs;
  }
}
