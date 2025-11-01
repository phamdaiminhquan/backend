import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) phoneNumber!: string | null;
  @ApiProperty({ nullable: true }) image!: string | null;
  @ApiProperty() rewardPoints!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  // Optional: order history summary
  @ApiProperty({ required: false, isArray: true })
  orders?: Array<{
    id: number;
    status: string;
    createdAt: Date;
    paymentMethod: string | null;
    total: number;
  }>;
}

