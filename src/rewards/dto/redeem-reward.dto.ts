import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RedeemRewardDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiProperty({ example: 'free-drink', required: false })
  @IsOptional()
  @IsString()
  offerId?: string;

  @ApiProperty({ example: 'Redeem for free drink', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
