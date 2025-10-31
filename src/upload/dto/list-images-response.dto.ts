import { ApiProperty } from '@nestjs/swagger';
import { UploadResponseDto } from './upload-response.dto';

export class ListImagesResponseDto {
  @ApiProperty({ type: [UploadResponseDto] })
  data!: UploadResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 24 })
  limit!: number;

  @ApiProperty({ example: 120 })
  total!: number;
}

