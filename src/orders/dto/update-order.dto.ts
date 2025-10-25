import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../enums/order.enum';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PAID,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Cancellation reason (required when status is cancelled)',
    example: 'Customer requested cancellation',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

