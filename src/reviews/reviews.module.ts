import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AdminReviewsController } from './admin-reviews.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Review, User, Customer])],
  controllers: [AdminReviewsController, PublicReviewsController],
  providers: [ReviewsService, RolesGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}
