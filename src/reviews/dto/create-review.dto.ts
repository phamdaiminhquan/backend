import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength, IsNumber, IsIn, IsUrl } from 'class-validator';
import { ALLOWED_REVIEW_RATINGS } from '../constants/review.constants';

export class CreateReviewDto {
  @ApiPropertyOptional({ description: 'ID of the registered user authoring the review', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ description: 'ID of the guest customer authoring the review', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiProperty({ description: 'Review text content', example: 'Great coffee and friendly staff!', minLength: 10 })
  @IsString()
  @MinLength(10)
  @IsNotEmpty()
  comment!: string;

  @ApiProperty({ description: 'Star rating in 0.5 increments', enum: ALLOWED_REVIEW_RATINGS, example: 4.5 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsIn(ALLOWED_REVIEW_RATINGS)
  rating!: number;

  @ApiPropertyOptional({ description: 'Array of image URLs attached to the review', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  images?: string[];
}
