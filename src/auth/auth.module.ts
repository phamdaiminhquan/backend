import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawExpires = configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
        const expiresIn: SignOptions['expiresIn'] = /^\d+$/.test(rawExpires)
          ? Number(rawExpires)
          : (rawExpires as StringValue);

        return {
          secret: configService.get<string>('JWT_ACCESS_SECRET', 'changeThisAccessSecret'),
          signOptions: { expiresIn },
        };
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
