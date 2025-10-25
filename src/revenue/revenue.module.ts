import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderDetail])],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}

