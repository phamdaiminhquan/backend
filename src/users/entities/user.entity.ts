import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../enums/user.enum';
import { RewardTransaction } from '../../rewards/entities/reward-transaction.entity';
import { ContactMessage } from '../../contact/entities/contact-message.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index({ unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ type: 'int', default: 0 })
  rewardPoints!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash?: string | null;

  @OneToMany(() => RewardTransaction, (transaction) => transaction.user)
  rewardTransactions!: RewardTransaction[];

  @OneToMany(() => ContactMessage, (message) => message.user)
  contactMessages!: ContactMessage[];

  @OneToMany(() => Review, (review) => review.user)
  reviews!: Review[];
}
