import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';

const ratingTransformer = {
  to: (value: number) => value,
  from: (value: string | null): number | null => (value === null || value === undefined ? null : Number(value)),
};

@Entity('reviews')
export class Review extends BaseEntity {
  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'int', nullable: true })
  customerId?: number | null;

  @ManyToOne(() => User, (user) => user.reviews, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  @ManyToOne(() => Customer, (customer) => customer.reviews, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer | null;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, transformer: ratingTransformer })
  rating!: number;

  @Column({ type: 'json', nullable: true })
  images?: string[] | null;
}

/// comment 