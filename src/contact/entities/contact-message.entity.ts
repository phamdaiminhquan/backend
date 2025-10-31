import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ContactStatus } from '../../enums/contact.enum';
import { User } from '../../users/entities/user.entity';

@Entity('contact_messages')
export class ContactMessage extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.NEW })
  status!: ContactStatus;

  @Column({ type: 'int', nullable: true })
  userId?: number;

  @ManyToOne(() => User, (user) => user.contactMessages, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
