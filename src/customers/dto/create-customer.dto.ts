import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Phone number (optional, unique)', example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Profile image URL', example: 'https://cdn/img.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;
}

