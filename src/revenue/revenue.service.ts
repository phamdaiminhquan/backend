import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order-detail.entity';
import { OrderStatus, PaymentMethod } from '../enums/order.enum';
import { RevenueReportDto, PaymentMethodBreakdown } from './dto/revenue-report.dto';

@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailsRepository: Repository<OrderDetail>,
  ) {}

  async getDailyRevenue(date: Date): Promise<RevenueReportDto> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all paid orders for the day
    const orders = await this.ordersRepository.find({
      where: {
        status: OrderStatus.PAID,
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['orderDetails'],
    });

    // Calculate totals
    let totalRevenue = 0;
    const paymentBreakdown: PaymentMethodBreakdown = {
      cash: 0,
      bank_transfer: 0,
    };

    for (const order of orders) {
      const orderTotal = order.orderDetails.reduce((sum, detail) => sum + Number(detail.subtotal), 0);
      totalRevenue += orderTotal;

      if (order.paymentMethod === PaymentMethod.CASH) {
        paymentBreakdown.cash += orderTotal;
      } else if (order.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        paymentBreakdown.bank_transfer += orderTotal;
      }
    }

    return {
      date: date.toISOString().split('T')[0],
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paymentMethodBreakdown: paymentBreakdown,
    };
  }

  async getRevenueRange(startDate: Date, endDate: Date): Promise<RevenueReportDto[]> {
    const reports: RevenueReportDto[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const report = await this.getDailyRevenue(currentDate);
      reports.push(report);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return reports;
  }
}

