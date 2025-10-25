import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('order_details')
export class OrderDetail extends BaseEntity {
  @Column({ type: 'int' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.orderDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}

