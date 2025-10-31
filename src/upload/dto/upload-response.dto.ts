import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for file upload operations
 */
export class UploadResponseDto {
  @ApiProperty({
    description: 'File upload record ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Original filename from user',
    example: 'cappuccino.jpg',
  })
  originalFilename!: string;

  @ApiProperty({
    description: 'Unique filename saved on server',
    example: '1234567890-cappuccino.jpg',
  })
  savedFilename!: string;

  @ApiProperty({
    description: 'Relative file path',
    example: 'uploads/1234567890-cappuccino.jpg',
  })
  filepath!: string;

  @ApiProperty({
    description: 'Public URL to access the file',
    example: 'http://localhost:3000/uploads/1234567890-cappuccino.jpg',
  })
  url!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245678,
  })
  filesize!: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  mimetype!: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;
}

