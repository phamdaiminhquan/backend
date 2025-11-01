import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  // Unique when not null; Postgres unique allows multiple NULLs
  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image?: string | null;

  @Column({ type: 'int', default: 0 })
  rewardPoints!: number;
  
  @OneToMany(() => Review, (review) => review.customer)
  reviews!: Review[];
}

