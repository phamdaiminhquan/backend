import { Entity, Column, OneToMany } from 'typeorm';
import { OrderDetail } from './order-detail.entity';
import { OrderStatus, PaymentMethod } from '../../enums/order.enum';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'varchar', length: 255, default: 'Khách vãng lai' })
  customerName: string;

  @Column({ type: 'int', nullable: true })
  userId: number;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: true })
  orderDetails: OrderDetail[];
}

