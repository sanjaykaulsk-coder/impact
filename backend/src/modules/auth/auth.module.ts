import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';
import { MockOtpProvider } from './otp/mock-otp.provider';
import { OTP_PROVIDER } from './otp/otp-provider.interface';
import { TokenService } from './token.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    DeviceService,
    JwtStrategy,
    {
      provide: OTP_PROVIDER,
      useFactory: () => {
        const provider = process.env.OTP_PROVIDER ?? 'mock';
        if (provider !== 'mock') {
          throw new Error(
            `OTP_PROVIDER=${provider} has no adapter implementation yet — only "mock" exists in this phase.`,
          );
        }
        return new MockOtpProvider();
      },
    },
  ],
  exports: [TokenService],
})
export class AuthModule {}
