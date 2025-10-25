import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Coffee',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All types of coffee beverages',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

