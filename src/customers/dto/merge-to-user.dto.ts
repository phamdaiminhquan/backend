import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MergeToUserDto {
  @ApiProperty({ description: 'Phone number used to lookup the user account', example: '0901234567' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ description: 'Confirm merge with the found user', default: false })
  @IsOptional()
  @IsBoolean()
  confirmMerge?: boolean;
}

