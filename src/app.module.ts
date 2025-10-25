import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { RevenueModule } from './revenue/revenue.module';
import { Category } from './categories/entities/category.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { OrderDetail } from './orders/entities/order-detail.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'Heimerdinger123',
      database: process.env.DB_NAME || 'coffee_shop',
      entities: [Category, Product, Order, OrderDetail],
      synchronize: true,
      // synchronize: process.env.NODE_ENV !== 'production',
      // logging: process.env.NODE_ENV === 'development',
    }),
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    RevenueModule,
  ],
})
export class AppModule { }
