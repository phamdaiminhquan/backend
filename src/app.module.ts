import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { RevenueModule } from './revenue/revenue.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RewardsModule } from './rewards/rewards.module';
import { ContactModule } from './contact/contact.module';
import { StatsModule } from './stats/stats.module';
import { Category } from './categories/entities/category.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { OrderDetail } from './orders/entities/order-detail.entity';
import { FileUpload } from './upload/entities/file-upload.entity';
import { User } from './users/entities/user.entity';
import { RewardTransaction } from './rewards/entities/reward-transaction.entity';
import { ContactMessage } from './contact/entities/contact-message.entity';

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
      entities: [
        Category,
        Product,
        Order,
        OrderDetail,
        FileUpload,
        User,
        RewardTransaction,
        ContactMessage,
      ],
      synchronize: true,
      // synchronize: process.env.NODE_ENV !== 'production',
      // logging: process.env.NODE_ENV === 'development',
    }),
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    RevenueModule,
    UploadModule,
    UsersModule,
    AuthModule,
    RewardsModule,
    ContactModule,
    StatsModule,
  ],
})
export class AppModule { }
