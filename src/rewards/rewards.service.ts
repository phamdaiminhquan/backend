import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardTransaction } from './entities/reward-transaction.entity';
import { UsersService } from '../users/users.service';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { RewardTransactionType } from '../enums/reward.enum';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardTransaction)
    private readonly rewardTransactionRepository: Repository<RewardTransaction>,
    private readonly usersService: UsersService,
  ) {}

  async getPoints(userId: number): Promise<{ points: number }> {
    const user = await this.usersService.mustFindById(userId);
    return { points: user.rewardPoints };
  }

  async getHistory(userId: number): Promise<RewardTransaction[]> {
    await this.usersService.mustFindById(userId);
    return this.rewardTransactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async earnPoints(
    userId: number,
    points: number,
    metadata?: { orderId?: number; total?: number; description?: string },
  ): Promise<{ points: number }> {
    if (points <= 0) {
      const user = await this.usersService.mustFindById(userId);
      return { points: user.rewardPoints };
    }

    const user = await this.usersService.adjustRewardPoints(userId, points);

    const description =
      metadata?.description ??
      (metadata?.orderId
        ? `Earned ${points} points from order #${metadata.orderId}`
        : `Earned ${points} reward points`);

    const transaction = this.rewardTransactionRepository.create({
      userId,
      type: RewardTransactionType.EARN,
      points,
      balanceAfter: user.rewardPoints,
      description,
    });

    await this.rewardTransactionRepository.save(transaction);
    return { points: user.rewardPoints };
  }

  async redeem(userId: number, dto: RedeemRewardDto): Promise<{ points: number }> {
    const user = await this.usersService.mustFindById(userId);

    if (user.rewardPoints < dto.points) {
      throw new BadRequestException('Not enough reward points');
    }

    user.rewardPoints -= dto.points;
    await this.usersService.setRewardPoints(user.id, user.rewardPoints);

    const transaction = this.rewardTransactionRepository.create({
      userId: user.id,
      type: RewardTransactionType.REDEEM,
      points: dto.points,
      balanceAfter: user.rewardPoints,
      description: dto.description ?? `Redeemed ${dto.points} points${dto.offerId ? ` for ${dto.offerId}` : ''}`,
    });

    await this.rewardTransactionRepository.save(transaction);
    return { points: user.rewardPoints };
  }

  getAvailableOffers(): Array<{ id: string; name: string; cost: number; description: string }> {
    return [
      {
        id: 'free-small-drink',
        name: 'Free Small Drink',
        cost: 80,
        description: 'Redeem for any small-sized drink (iced or hot)',
      },
      {
        id: 'free-topping',
        name: 'Free Extra Topping',
        cost: 40,
        description: 'Add an extra topping to your drink at no cost',
      },
      {
        id: 'discount-10',
        name: '10% Discount Voucher',
        cost: 120,
        description: 'Apply 10% discount on your next order',
      },
    ];
  }
}
