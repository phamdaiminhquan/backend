import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodBreakdown {
  @ApiProperty({
    description: 'Total revenue from cash payments',
    example: 150000,
  })
  cash: number;

  @ApiProperty({
    description: 'Total revenue from bank transfer payments',
    example: 200000,
  })
  bank_transfer: number;
}

export class RevenueReportDto {
  @ApiProperty({
    description: 'Report date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Total number of paid orders',
    example: 10,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Total revenue amount',
    example: 350000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue breakdown by payment method',
    type: PaymentMethodBreakdown,
  })
  paymentMethodBreakdown: PaymentMethodBreakdown;
}

