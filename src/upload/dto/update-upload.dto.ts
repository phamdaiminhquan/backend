import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUploadDto {
  @ApiPropertyOptional({ description: 'New original filename label', example: 'latte.jpg' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  originalFilename?: string;
}

