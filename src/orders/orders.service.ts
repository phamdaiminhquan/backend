import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { OrderStatus } from '../enums/order.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailsRepository: Repository<OrderDetail>,
    private productsService: ProductsService,
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
      paymentMethod: createOrderDto.paymentMethod,
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

  async findAll(customerName?: string): Promise<Order[]> {
    const query = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product');

    if (customerName) {
      query.where('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
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

    await this.ordersRepository.update(id, updateOrderDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
  }
}

