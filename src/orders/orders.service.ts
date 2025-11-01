import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { OrderStatus, PaymentMethod } from '../enums/order.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';
import { RewardsService } from '../rewards/rewards.service';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailsRepository: Repository<OrderDetail>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private productsService: ProductsService,
    private rewardsService: RewardsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    if (!createOrderDto.orderDetails || createOrderDto.orderDetails.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Ensure order is linked to either a user OR a customer (not both)
    if (createOrderDto.userId && createOrderDto.customerId) {
      throw new BadRequestException('Order cannot be linked to both user and customer');
    }

    // Verify all products exist
    for (const detail of createOrderDto.orderDetails) {
      await this.productsService.findOne(detail.productId);
    }

    // Determine customerId for walk-in customers or provided customerId
    let resolvedCustomerId: number | undefined = undefined;
    if (createOrderDto.customerId) {
      const customer = await this.customersRepository.findOne({ where: { id: createOrderDto.customerId, deletedAt: IsNull() } });
      if (!customer) throw new BadRequestException('Customer not found or deleted');
      resolvedCustomerId = customer.id;
    } else if (!createOrderDto.userId) {
      const rawName = (createOrderDto.customerName || '').trim();
      if (rawName) {
        const existing = await this.customersRepository
          .createQueryBuilder('c')
          .where('c.deletedAt IS NULL')
          .andWhere('c.phoneNumber IS NULL')
          .andWhere('LOWER(c.name) = :name', { name: rawName.toLowerCase() })
          .getOne();
        if (existing) {
          resolvedCustomerId = existing.id;
        } else {
          const newCustomer = this.customersRepository.create({ name: rawName, phoneNumber: null });
          const savedCustomer = await this.customersRepository.save(newCustomer);
          resolvedCustomerId = savedCustomer.id;
        }
      }
    }

    const order = this.ordersRepository.create({
      customerName: createOrderDto.customerName || 'Khách vãng lai',
      userId: createOrderDto.userId,
      customerId: resolvedCustomerId,
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

    // Transactionally update order status and increment product salesCount when transitioning to PAID
    await this.ordersRepository.manager.transaction(async (manager) => {
      // Update order using the transactional entity manager
      await manager.getRepository(Order).update(id, updateOrderDto);

      if (updateOrderDto.status === OrderStatus.PAID && previousStatus !== OrderStatus.PAID) {
        // Load order details within the transaction
        const details = await manager.getRepository(OrderDetail).find({ where: { orderId: id } });
        for (const detail of details) {
          // Increment salesCount by ordered quantity for each product
          await manager.getRepository(Product).increment({ id: detail.productId }, 'salesCount', detail.quantity);
        }
      }
    });

    const updatedOrder = await this.findOne(id);

    // Award reward points after successful status change (non-transactional)
    if (updateOrderDto.status === OrderStatus.PAID && previousStatus !== OrderStatus.PAID) {
      const orderTotal = updatedOrder.orderDetails.reduce((sum, detail) => sum + Number(detail.subtotal), 0);
      const earnedPoints = Math.floor(orderTotal / 1000);

      if (earnedPoints > 0) {
        if (updatedOrder.userId) {
          await this.rewardsService.earnPoints(updatedOrder.userId, earnedPoints, {
            orderId: updatedOrder.id,
            total: orderTotal,
          });
        } else if (updatedOrder.customerId) {
          // Award to guest customer
          if ((this.rewardsService as any).earnPointsForCustomer) {
            await (this.rewardsService as any).earnPointsForCustomer(updatedOrder.customerId, earnedPoints, {
              orderId: updatedOrder.id,
              total: orderTotal,
            });
          }
        }
      }
    }

    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
  }
}

