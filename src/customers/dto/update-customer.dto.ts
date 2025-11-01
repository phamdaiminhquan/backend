import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer name', example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number (optional, unique)', example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Profile image URL', example: 'https://cdn/new.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;
}

