import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class ListImagesQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 24, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 24))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;

  @ApiPropertyOptional({ description: 'Search text (matches originalFilename, savedFilename, filepath)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter createdAt from (inclusive), ISO 8601 date string' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter createdAt to (inclusive), ISO 8601 date string' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort string: field:direction', example: 'createdAt:desc', default: 'createdAt:desc' })
  @IsOptional()
  @IsString()
  @Matches(/^(originalFilename|savedFilename|filesize|createdAt):(asc|desc)$/i, {
    message: 'sort must be one of originalFilename|savedFilename|filesize|createdAt with :asc or :desc',
  })
  sort?: string = 'createdAt:desc';
}

