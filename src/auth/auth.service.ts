import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Record<string, unknown>;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private sanitizeUser(user: User): Record<string, unknown> {
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }

  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private resolveExpiresIn(value: string | undefined, fallback: string): SignOptions['expiresIn'] {
    const raw = value ?? fallback;
    return /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'changeThisRefreshSecret'),
      expiresIn: this.resolveExpiresIn(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'), '7d'),
    });

    await this.usersService.updateRefreshTokenHash(user.id, await this.hashData(refreshToken));

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await this.hashData(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
    });

    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  async getProfile(userId: number): Promise<Record<string, unknown>> {
    const user = await this.usersService.mustFindById(userId);
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Record<string, unknown>> {
    const user = await this.usersService.mustFindById(userId);

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }

      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const updatedUser = await this.usersService.updateProfile(userId, {
      fullName: dto.fullName,
      phone: dto.phone,
      passwordHash: dto.newPassword ? await this.hashData(dto.newPassword) : undefined,
    });

    return this.sanitizeUser(updatedUser);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    let payload: { sub: number; email: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'changeThisRefreshSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.mustFindById(payload.sub);
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is not registered');
    }

    const isValid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    return this.generateTokens(user);
  }
}
