import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * FileUpload entity to track all uploaded files
 * Extends BaseEntity to inherit common fields (id, createdAt, updatedAt, createdBy, updatedBy, deletedAt)
 */
@Entity('file_uploads')
export class FileUpload extends BaseEntity {
  @ApiProperty({
    description: 'Original filename from user upload',
    example: 'cappuccino.jpg',
  })
  @Column({ type: 'varchar', length: 255 })
  originalFilename!: string;

  @ApiProperty({
    description: 'Unique filename saved on server (UUID-based)',
    example: '1234567890-cappuccino.jpg',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  savedFilename!: string;

  @ApiProperty({
    description: 'Relative path to the file',
    example: 'uploads/1234567890-cappuccino.jpg',
  })
  @Column({ type: 'varchar', length: 500 })
  filepath!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245678,
  })
  @Column({ type: 'bigint' })
  filesize!: number;

  @ApiProperty({
    description: 'Validated MIME type of the file',
    example: 'image/jpeg',
  })
  @Column({ type: 'varchar', length: 100 })
  mimetype!: string;

  @ApiProperty({
    description: 'User ID who uploaded the file (if available)',
    example: 1,
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  uploadedBy?: number;

  @ApiProperty({
    description: 'Public URL to access the file',
    example: 'http://localhost:3000/uploads/1234567890-cappuccino.jpg',
  })
  getUrl(baseUrl: string): string {
    return `${baseUrl}/${this.filepath}`;
  }
}

