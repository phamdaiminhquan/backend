import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RewardTransactionType } from '../../enums/reward.enum';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('reward_transactions')
export class RewardTransaction extends BaseEntity {
  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @ManyToOne(() => User, (user) => user.rewardTransactions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  @Column({ type: 'int', nullable: true })
  customerId?: number | null;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer | null;

  @Column({ type: 'enum', enum: RewardTransactionType })
  type!: RewardTransactionType;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'int' })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;
}
