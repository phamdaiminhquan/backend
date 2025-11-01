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
import { CustomersModule } from './customers/customers.module';
import { Customer } from './customers/entities/customer.entity';
import { Review } from './reviews/entities/review.entity';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    // Đọc file .env (isGlobal giúp dùng ở mọi module)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Kết nối DB linh hoạt cho local & production
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProd = process.env.NODE_ENV === 'production';
        const baseConfig = {
          type: 'postgres' as const,
          entities: [
            Category,
            Product,
            Order,
            OrderDetail,
            FileUpload,
            User,
            Customer,
            Review,
            RewardTransaction,
            ContactMessage,
          ],
          autoLoadEntities: true,
          synchronize: !isProd, // tránh sync tự động ở production
        };

        // Nếu có DATABASE_URL (Neon, Render, Supabase...)
        if (process.env.DATABASE_URL) {
          return {
            ...baseConfig,
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }, // Neon yêu cầu SSL
          };
        }

        // Ngược lại, dùng cấu hình local
        return {
          ...baseConfig,
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'coffee_shop',
        };
      },
    }),

    // Các module còn lại
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    RevenueModule,
    UploadModule,
    UsersModule,
    CustomersModule,
    AuthModule,
    RewardsModule,
    ContactModule,
    StatsModule,
    ReviewsModule,
  ],
})
export class AppModule {}
