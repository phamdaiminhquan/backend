import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { OrderStatus, PaymentMethod } from '../enums/order.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailsRepository: Repository<OrderDetail>,
  private productsService: ProductsService,
  private rewardsService: RewardsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    if (!createOrderDto.orderDetails || createOrderDto.orderDetails.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Verify all products exist
    for (const detail of createOrderDto.orderDetails) {
      await this.productsService.findOne(detail.productId);
    }

    const order = this.ordersRepository.create({
      customerName: createOrderDto.customerName || 'Khách vãng lai',
      userId: createOrderDto.userId,
      paymentMethod: createOrderDto.paymentMethod ?? PaymentMethod.CASH,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Create order details
    const orderDetails = createOrderDto.orderDetails.map((detail) => {
      const subtotal = detail.quantity * detail.unitPrice;
      return this.orderDetailsRepository.create({
        orderId: savedOrder.id,
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        subtotal,
      });
    });

    await this.orderDetailsRepository.save(orderDetails);
    return this.findOne(savedOrder.id);
  }

  async findAll(options?: { customerName?: string; userId?: number }): Promise<Order[]> {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product');

    if (options?.customerName) {
      query.where('order.customerName LIKE :customerName', {
        customerName: `%${options.customerName}%`,
      });
    }

    if (options?.userId) {
      if (options.customerName) {
        query.andWhere('order.userId = :userId', { userId: options.userId });
      } else {
        query.where('order.userId = :userId', { userId: options.userId });
      }
    }

    return query.orderBy('order.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['orderDetails', 'orderDetails.product'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderDto.status === OrderStatus.CANCELLED && !updateOrderDto.cancellationReason) {
      throw new BadRequestException('Cancellation reason is required when cancelling an order');
    }

    const previousStatus = order.status;

    await this.ordersRepository.update(id, updateOrderDto);
    const updatedOrder = await this.findOne(id);

    if (
      updateOrderDto.status === OrderStatus.PAID &&
      previousStatus !== OrderStatus.PAID &&
      updatedOrder.userId
    ) {
      const orderTotal = updatedOrder.orderDetails.reduce((sum, detail) => sum + Number(detail.subtotal), 0);
  // Simple loyalty conversion: ~1 point per 1,000 currency units spent
  const earnedPoints = Math.floor(orderTotal / 1000);

      if (earnedPoints > 0) {
        await this.rewardsService.earnPoints(updatedOrder.userId, earnedPoints, {
          orderId: updatedOrder.id,
          total: orderTotal,
        });
      }
    }

    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
  }
}

