import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../enums/user.enum';
import { PaginatedReviewResponseDto } from './dto/paginated-review-response.dto';

interface RequestWithUser extends Request {
  user?: { id?: number };
}

@ApiTags('admin/reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  private getCurrentUserId(request: RequestWithUser): number {
    const adminId = request.user?.id;
    if (!adminId) {
      throw new BadRequestException('Authenticated admin user is required');
    }
    return adminId;
  }

  private parseOptionalNumber(value: string | undefined, field: string, options: { integer?: boolean } = {}): number | undefined {
    if (value === undefined || value === null || value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`Invalid ${field} value`);
    }
    if (options.integer && !Number.isInteger(parsed)) {
      throw new BadRequestException(`${field} must be an integer`);
    }
    return parsed;
  }

  private parseBoolean(value: string | undefined, field = 'includeDeleted'): boolean | undefined {
    if (value === undefined || value === null || value.trim() === '') {
      return undefined;
    }
    const normalized = value.toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
    throw new BadRequestException(`${field} must be true or false`);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new review (admin only)' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully', type: ReviewResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async create(@Body() dto: CreateReviewDto, @Req() request: RequestWithUser): Promise<ReviewResponseDto> {
    const adminId = this.getCurrentUserId(request);
    return this.reviewsService.create(dto, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'List reviews with pagination, search, and filters (admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by comment or author name' })
  @ApiQuery({ name: 'rating', required: false, description: 'Exact rating filter (0.5 increments)' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating (0.5 increments)' })
  @ApiQuery({ name: 'maxRating', required: false, description: 'Maximum rating (0.5 increments)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by registered user ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by guest customer ID' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort expression, e.g., createdAt:desc,rating:desc' })
  @ApiQuery({ name: 'includeDeleted', required: false, description: 'Include soft-deleted reviews (true/false)' })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews', type: PaginatedReviewResponseDto })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rating') rating?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
    @Query('sort') sort?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<PaginatedReviewResponseDto> {
    return this.reviewsService.adminList({
      page: this.parseOptionalNumber(page, 'page', { integer: true }),
      limit: this.parseOptionalNumber(limit, 'limit', { integer: true }),
      search: search?.trim() || undefined,
      rating: this.parseOptionalNumber(rating, 'rating'),
      minRating: this.parseOptionalNumber(minRating, 'minRating'),
      maxRating: this.parseOptionalNumber(maxRating, 'maxRating'),
      userId: this.parseOptionalNumber(userId, 'userId', { integer: true }),
      customerId: this.parseOptionalNumber(customerId, 'customerId', { integer: true }),
      sort: sort?.trim() || undefined,
      includeDeleted: this.parseBoolean(includeDeleted),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiQuery({ name: 'includeDeleted', required: false, description: 'Include soft-deleted review (true/false)' })
  @ApiResponse({ status: 200, description: 'Review details', type: ReviewResponseDto })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id') id: string, @Query('includeDeleted') includeDeleted?: string): Promise<ReviewResponseDto> {
    const reviewId = this.parseOptionalNumber(id, 'id', { integer: true });
    if (reviewId === undefined) {
      throw new BadRequestException('id is required');
    }
    const includeDeletedBool = this.parseBoolean(includeDeleted) ?? false;
    return this.reviewsService.findOne(reviewId, includeDeletedBool);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a review (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateReviewDto })
  @ApiResponse({ status: 200, description: 'Review updated successfully', type: ReviewResponseDto })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Req() request: RequestWithUser,
  ): Promise<ReviewResponseDto> {
    const reviewId = this.parseOptionalNumber(id, 'id', { integer: true });
    if (reviewId === undefined) {
      throw new BadRequestException('id is required');
    }
    const adminId = this.getCurrentUserId(request);
    return this.reviewsService.update(reviewId, dto, adminId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a review (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() request: RequestWithUser): Promise<void> {
    const reviewId = this.parseOptionalNumber(id, 'id', { integer: true });
    if (reviewId === undefined) {
      throw new BadRequestException('id is required');
    }
    const adminId = this.getCurrentUserId(request);
    await this.reviewsService.softDelete(reviewId, adminId);
  }
}
