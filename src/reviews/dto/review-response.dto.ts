import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Great coffee and atmosphere.' })
  comment!: string;

  @ApiProperty({ example: 4.5 })
  rating!: number;

  @ApiProperty({ type: [String], example: ['https://cdn.example.com/reviews/1.jpg'] })
  images!: string[];

  @ApiProperty({ example: 10, nullable: true })
  userId!: number | null;

  @ApiProperty({ example: 7, nullable: true })
  customerId!: number | null;

  @ApiProperty({ example: 'user', nullable: true })
  authorType!: 'user' | 'customer' | null;

  @ApiProperty({ example: 'Nguyen Van A', nullable: true })
  authorName!: string | null;

  @ApiProperty({ example: '2025-01-01T08:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-02T08:30:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ example: null, nullable: true })
  deletedAt!: Date | null;
}
