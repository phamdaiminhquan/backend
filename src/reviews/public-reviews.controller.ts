import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { PaginatedReviewResponseDto } from './dto/paginated-review-response.dto';

@ApiTags('reviews')
@Controller('api/reviews')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

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

  @Get()
  @ApiOperation({ summary: 'List published reviews for the customer-facing website' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort expression, e.g., createdAt:desc,rating:desc' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating filter (0.5 increments)' })
  @ApiQuery({ name: 'maxRating', required: false, description: 'Maximum rating filter (0.5 increments)' })
  @ApiResponse({ status: 200, description: 'Paginated list of public reviews', type: PaginatedReviewResponseDto })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
  ): Promise<PaginatedReviewResponseDto> {
    return this.reviewsService.publicList({
      page: this.parseOptionalNumber(page, 'page', { integer: true }),
      limit: this.parseOptionalNumber(limit, 'limit', { integer: true }),
      sort: sort?.trim() || undefined,
      minRating: this.parseOptionalNumber(minRating, 'minRating'),
      maxRating: this.parseOptionalNumber(maxRating, 'maxRating'),
    });
  }
}
