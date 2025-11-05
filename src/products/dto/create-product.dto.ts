import { IsString, IsNumber, IsOptional, IsEnum, Min, MinLength, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../enums/product.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Cappuccino',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'A classic Italian coffee drink with espresso and steamed milk foam',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product selling price',
    example: 45000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Product image URL or path',
    example: '/images/cappuccino.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Category ID that this product belongs to',
    example: 1,
  })
  @IsNumber()
  categoryId: number;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
    default: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Average rating (0.0 - 5.0, step 0.1)',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of reviews', example: 12, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @ApiPropertyOptional({ description: 'Total views', example: 250, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  views?: number;

  @ApiPropertyOptional({ description: 'Total clicks', example: 180, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clicks?: number;

  @ApiPropertyOptional({ description: 'Total orders count', example: 40, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orders?: number;
}

