import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { isAuthDisabled } from '../common/utils/auth-bypass.util';

interface RequestWithUser extends Request {
  user?: { id?: number };
}

@ApiTags('rewards')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  private resolveUserId(request: RequestWithUser): number {
    const userId = request.user?.id;

    if (typeof userId === 'number') {
      return userId;
    }

    if (isAuthDisabled()) {
      throw new BadRequestException('Provide X-User-Id header when authentication is disabled.');
    }

    throw new BadRequestException('Missing authenticated user context.');
  }

  @Get('points')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current reward points of logged-in user' })
  @ApiResponse({ status: 200, description: 'Current reward point balance' })
  async getPoints(@Req() request: RequestWithUser) {
    const userId = this.resolveUserId(request);
    return this.rewardsService.getPoints(userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reward transaction history for current user' })
  @ApiResponse({ status: 200, description: 'Reward transaction history' })
  async getHistory(@Req() request: RequestWithUser) {
    const userId = this.resolveUserId(request);
    return this.rewardsService.getHistory(userId);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem reward points for an offer' })
  @ApiResponse({ status: 200, description: 'Reward points after redemption' })
  async redeem(@Req() request: RequestWithUser, @Body() dto: RedeemRewardDto) {
    const userId = this.resolveUserId(request);
    return this.rewardsService.redeem(userId, dto);
  }

  @Get('offers')
  @ApiOperation({ summary: 'List available reward offers' })
  @ApiResponse({ status: 200, description: 'Available offers for redemption' })
  getOffers() {
    return this.rewardsService.getAvailableOffers();
  }
}
