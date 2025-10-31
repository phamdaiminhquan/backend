import { BadRequestException, Body, Controller, Get, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { isAuthDisabled } from '../common/utils/auth-bypass.util';

interface RequestWithUser extends Request {
  user?: (Record<string, unknown> & { id?: number }) | undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh authentication tokens using a refresh token' })
  @ApiResponse({ status: 200, description: 'New tokens generated' })
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() request: RequestWithUser): Promise<{ message: string }> {
    const userId = request.user?.id;

    if (!userId) {
      if (isAuthDisabled()) {
        return { message: 'Authentication temporarily disabled; logout skipped.' };
      }

      throw new UnauthorizedException();
    }

    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@Req() request: RequestWithUser): Promise<Record<string, unknown>> {
    const userId = request.user?.id;

    if (!userId) {
      if (isAuthDisabled()) {
        throw new BadRequestException('Provide X-User-Id header when authentication is disabled.');
      }

      throw new UnauthorizedException();
    }

    return this.authService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile and password' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    const userId = request.user?.id;

    if (!userId) {
      if (isAuthDisabled()) {
        throw new BadRequestException('Provide X-User-Id header when authentication is disabled.');
      }

      throw new UnauthorizedException();
    }

    return this.authService.updateProfile(userId, dto);
  }
}
