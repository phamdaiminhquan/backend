import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RewardTransactionType } from '../../enums/reward.enum';
import { User } from '../../users/entities/user.entity';

@Entity('reward_transactions')
export class RewardTransaction extends BaseEntity {
  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.rewardTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: RewardTransactionType })
  type!: RewardTransactionType;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'int' })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;
}
