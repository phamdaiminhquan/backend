import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order-detail.entity';
import { OrderStatus } from '../enums/order.enum';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailsRepository: Repository<OrderDetail>,
  ) {}

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [totalOrders, pendingOrders, paidOrders, cancelledOrders, totalRevenueRaw, todayRevenueRaw, topProducts] =
      await Promise.all([
        this.ordersRepository.count(),
        this.ordersRepository.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
        this.ordersRepository.count({ where: { status: OrderStatus.PAID } }),
        this.ordersRepository.count({ where: { status: OrderStatus.CANCELLED } }),
        this.sumRevenue(),
        this.sumRevenue(today, endOfToday),
        this.getTopProducts(5),
      ]);

    return {
      totalOrders,
      pendingOrders,
      paidOrders,
      cancelledOrders,
      totalRevenue: totalRevenueRaw,
      todayRevenue: todayRevenueRaw,
      topProducts,
    };
  }

  async getSales(startDate?: string, endDate?: string) {
    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    if (!startDate) {
      start.setDate(start.getDate() - 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const orders = await this.ordersRepository.find({
      where: {
        status: OrderStatus.PAID,
        createdAt: Between(start, end),
      },
      relations: ['orderDetails'],
      order: { createdAt: 'ASC' },
    });

    const salesMap = new Map<string, number>();
    const cursor = new Date(start);
    while (cursor <= end) {
      salesMap.set(cursor.toISOString().split('T')[0], 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      const total = order.orderDetails.reduce((sum, detail) => sum + Number(detail.subtotal), 0);
      salesMap.set(key, (salesMap.get(key) ?? 0) + total);
    }

    return Array.from(salesMap.entries()).map(([date, total]) => ({ date, total }));
  }

  async getTopProducts(limit = 5) {
    const raw = await this.orderDetailsRepository
      .createQueryBuilder('detail')
      .innerJoin('detail.product', 'product')
      .innerJoin('detail.order', 'order')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(detail.quantity)', 'quantity')
      .addSelect('SUM(detail.subtotal)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('SUM(detail.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return raw.map((row) => ({
      productId: Number(row.productId),
      productName: row.productName,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    }));
  }

  private async sumRevenue(start?: Date, end?: Date): Promise<number> {
    const query = this.orderDetailsRepository
      .createQueryBuilder('detail')
      .innerJoin('detail.order', 'order')
      .where('order.status = :status', { status: OrderStatus.PAID });

    if (start && end) {
      query.andWhere('order.createdAt BETWEEN :start AND :end', {
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }

    const result = await query.select('SUM(detail.subtotal)', 'sum').getRawOne<{ sum: string | null }>();
    return result?.sum ? Number(result.sum) : 0;
  }
}
