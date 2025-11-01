import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { PaginatedReviewResponseDto } from './dto/paginated-review-response.dto';
import { ALLOWED_REVIEW_RATINGS, isAllowedReviewRating } from './constants/review.constants';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';

interface AdminListOptions {
  page?: number;
  limit?: number;
  search?: string;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  userId?: number;
  customerId?: number;
  sort?: string;
  includeDeleted?: boolean;
}

interface PublicListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  minRating?: number;
  maxRating?: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
  ) {}

  private ensureAuthorCombination(userId?: number | null, customerId?: number | null, { allowNone = false }: { allowNone?: boolean } = {}): void {
    const hasUser = userId !== undefined && userId !== null;
    const hasCustomer = customerId !== undefined && customerId !== null;

    if (!allowNone && !hasUser && !hasCustomer) {
      throw new BadRequestException('Provide either userId or customerId');
    }

    if (hasUser && hasCustomer) {
      throw new BadRequestException('Review cannot reference both userId and customerId');
    }
  }

  private async ensureAuthorExists(userId?: number | null, customerId?: number | null): Promise<{ user?: User | null; customer?: Customer | null }> {
    if (userId !== undefined && userId !== null) {
      const user = await this.usersRepo.findOne({ where: { id: userId, deletedAt: IsNull() } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return { user };
    }

    if (customerId !== undefined && customerId !== null) {
      const customer = await this.customersRepo.findOne({ where: { id: customerId, deletedAt: IsNull() } });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      return { customer };
    }

    return {};
  }

  private normalizeImages(images?: string[]): string[] | null {
    if (!images) {
      return null;
    }
    const trimmed = images.map((url) => url.trim()).filter((url) => url.length > 0);
    return trimmed.length > 0 ? trimmed : [];
  }

  private mapToResponse(review: Review & { user?: User | null; customer?: Customer | null }): ReviewResponseDto {
    return {
      id: review.id,
      comment: review.comment,
      rating: Number(review.rating),
      images: Array.isArray(review.images) ? review.images : [],
      userId: review.userId ?? null,
      customerId: review.customerId ?? null,
      authorType: review.userId ? 'user' : review.customerId ? 'customer' : null,
      authorName: review.user?.fullName ?? review.customer?.name ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      deletedAt: review.deletedAt ?? null,
    };
  }

  private applyRatingFilter(qb: ReturnType<Repository<Review>['createQueryBuilder']>, rating?: number, minRating?: number, maxRating?: number): void {
    if (rating !== undefined && rating !== null) {
      if (!isAllowedReviewRating(rating)) {
        throw new BadRequestException(`rating must be one of ${ALLOWED_REVIEW_RATINGS.join(', ')}`);
      }
      qb.andWhere('review.rating = :rating', { rating });
    }

    if (minRating !== undefined && minRating !== null) {
      if (!isAllowedReviewRating(minRating)) {
        throw new BadRequestException(`minRating must be one of ${ALLOWED_REVIEW_RATINGS.join(', ')}`);
      }
      qb.andWhere('review.rating >= :minRating', { minRating });
    }

    if (maxRating !== undefined && maxRating !== null) {
      if (!isAllowedReviewRating(maxRating)) {
        throw new BadRequestException(`maxRating must be one of ${ALLOWED_REVIEW_RATINGS.join(', ')}`);
      }
      qb.andWhere('review.rating <= :maxRating', { maxRating });
    }

    if (
      minRating !== undefined &&
      minRating !== null &&
      maxRating !== undefined &&
      maxRating !== null &&
      minRating > maxRating
    ) {
      throw new BadRequestException('minRating cannot be greater than maxRating');
    }
  }

  private applySort(qb: ReturnType<Repository<Review>['createQueryBuilder']>, sort?: string): void {
    const defaultSort = [['review.createdAt', 'DESC'] as const];

    if (!sort || !sort.trim()) {
      defaultSort.forEach(([field, direction]) => qb.addOrderBy(field, direction));
      return;
    }

    const allowedFields: Record<string, string> = {
      createdAt: 'review.createdAt',
      updatedAt: 'review.updatedAt',
      rating: 'review.rating',
    };

    const segments = sort.split(',').map((segment) => segment.trim()).filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      defaultSort.forEach(([field, direction]) => qb.addOrderBy(field, direction));
      return;
    }

    for (const segment of segments) {
      const [field, rawDirection] = segment.split(':').map((part) => part.trim());
      const column = allowedFields[field];
      if (!column) {
        throw new BadRequestException(`Unsupported sort field: ${field}`);
      }
      const direction = rawDirection?.toUpperCase() === 'ASC' ? 'ASC' : rawDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'DESC';
      qb.addOrderBy(column, direction as 'ASC' | 'DESC');
    }

    if (!qb.expressionMap.orderBys || Object.keys(qb.expressionMap.orderBys).length === 0) {
      defaultSort.forEach(([field, direction]) => qb.addOrderBy(field, direction));
    }
  }

  async create(dto: CreateReviewDto, adminUserId: number): Promise<ReviewResponseDto> {
    this.ensureAuthorCombination(dto.userId ?? null, dto.customerId ?? null, { allowNone: false });

    const { user, customer } = await this.ensureAuthorExists(dto.userId ?? null, dto.customerId ?? null);

    if (!isAllowedReviewRating(dto.rating)) {
      throw new BadRequestException(`rating must be one of ${ALLOWED_REVIEW_RATINGS.join(', ')}`);
    }

    const review = this.reviewsRepo.create({
      userId: dto.userId ?? null,
      customerId: dto.customerId ?? null,
      comment: dto.comment.trim(),
      rating: dto.rating,
      images: this.normalizeImages(dto.images ?? undefined),
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });

    const saved = await this.reviewsRepo.save(review);
    const reloaded = await this.reviewsRepo.findOne({
      where: { id: saved.id },
      relations: { user: true, customer: true },
    });

    if (!reloaded) {
      throw new NotFoundException('Review not found after creation');
    }

    return this.mapToResponse({ ...reloaded, user: user ?? reloaded.user, customer: customer ?? reloaded.customer });
  }

  async adminList(options: AdminListOptions): Promise<PaginatedReviewResponseDto> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.reviewsRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.customer', 'customer');

    if (!options.includeDeleted) {
      qb.andWhere('review.deletedAt IS NULL');
    }

    if (options.search && options.search.trim()) {
      const search = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(review.comment) LIKE :search OR LOWER(user.fullName) LIKE :search OR LOWER(customer.name) LIKE :search)',
        { search },
      );
    }

    if (options.userId) {
      qb.andWhere('review.userId = :userId', { userId: options.userId });
    }

    if (options.customerId) {
      qb.andWhere('review.customerId = :customerId', { customerId: options.customerId });
    }

    this.applyRatingFilter(qb, options.rating, options.minRating, options.maxRating);
    this.applySort(qb, options.sort);

    const [records, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const data = records.map((record) => this.mapToResponse(record));

    return { data, total, page, limit };
  }

  async findOne(id: number, includeDeleted = false): Promise<ReviewResponseDto> {
    const where: FindOptionsWhere<Review> = { id };
    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }

    const review = await this.reviewsRepo.findOne({
      where,
      relations: { user: true, customer: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToResponse(review);
  }

  async update(id: number, dto: UpdateReviewDto, adminUserId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewsRepo.findOne({ where: { id, deletedAt: IsNull() }, relations: { user: true, customer: true } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    let nextUserId = review.userId ?? null;
    let nextCustomerId = review.customerId ?? null;

    const wantsUser = dto.userId !== undefined;
    const wantsCustomer = dto.customerId !== undefined;

    if (wantsUser || wantsCustomer) {
      this.ensureAuthorCombination(dto.userId ?? null, dto.customerId ?? null, { allowNone: false });

      if (wantsUser) {
        nextUserId = dto.userId ?? null;
        nextCustomerId = null;
      }

      if (wantsCustomer) {
        nextCustomerId = dto.customerId ?? null;
        nextUserId = null;
      }

      await this.ensureAuthorExists(nextUserId, nextCustomerId);
    }

    if (dto.comment !== undefined) {
      review.comment = dto.comment.trim();
    }

    if (dto.rating !== undefined) {
      if (!isAllowedReviewRating(dto.rating)) {
        throw new BadRequestException(`rating must be one of ${ALLOWED_REVIEW_RATINGS.join(', ')}`);
      }
      review.rating = dto.rating;
    }

    if (dto.images !== undefined) {
      review.images = this.normalizeImages(dto.images ?? undefined);
    }

    review.userId = nextUserId;
    review.customerId = nextCustomerId;
    review.updatedBy = adminUserId;

    await this.reviewsRepo.save(review);

    const reloaded = await this.reviewsRepo.findOne({ where: { id }, relations: { user: true, customer: true } });
    if (!reloaded) {
      throw new NotFoundException('Review not found after update');
    }

    return this.mapToResponse(reloaded);
  }

  async softDelete(id: number, adminUserId: number): Promise<void> {
    const review = await this.reviewsRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.deletedAt = new Date();
    review.updatedBy = adminUserId;
    await this.reviewsRepo.save(review);
  }

  async publicList(options: PublicListOptions): Promise<PaginatedReviewResponseDto> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.reviewsRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.customer', 'customer')
      .where('review.deletedAt IS NULL');

    this.applyRatingFilter(qb, undefined, options.minRating, options.maxRating);
    this.applySort(qb, options.sort);

    const [records, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const data = records.map((record) => this.mapToResponse(record));

    return { data, total, page, limit };
  }
}
