import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { ListImagesQueryDto } from './dto/list-images-query.dto';
import { ListImagesResponseDto } from './dto/list-images-response.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { multerConfig } from './config/multer.config';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload a single image file',
    description:
      'Upload an image file (jpg, jpeg, png, gif, webp). Maximum file size: 5MB. Returns file metadata including public URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, jpeg, png, gif, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file type, size, or missing file',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .gif, .webp',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'Payload too large - File size exceeds 5MB',
    schema: {
      example: {
        statusCode: 413,
        message: 'File size exceeds maximum allowed size of 5MB',
        error: 'Payload Too Large',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to save file',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Save file metadata to database
    return await this.uploadService.saveFileMetadata(file, file.filename);
  }

  @Get('images')
  @ApiOperation({
    summary: 'List uploaded images (admin)',
    description:
      'Returns paginated metadata for uploaded images with optional search, date range and sorting. Default sort: createdAt desc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of uploaded images',
    type: ListImagesResponseDto,
  })
  async getAllImages(@Query() query: ListImagesQueryDto): Promise<ListImagesResponseDto> {
    return await this.uploadService.findAllPaginated(query);
  }

  @Get('images/unused')
  @ApiOperation({
    summary: 'List unused images (admin)',
    description: 'Returns paginated images that are not referenced by any products (active).',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of unused images',
    type: ListImagesResponseDto,
  })
  async getUnusedImages(@Query() query: ListImagesQueryDto): Promise<ListImagesResponseDto> {
    return await this.uploadService.findUnusedPaginated(query);
  }


  @Get('image/:id')
  @ApiOperation({
    summary: 'Get specific image metadata by ID',
    description: 'Returns detailed metadata for a specific uploaded image',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'File upload ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Image metadata found',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'File with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async getImageById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UploadResponseDto> {
    return await this.uploadService.findOne(id);
  }

  @Patch('image/:id')
  @ApiOperation({
    summary: 'Update image metadata (admin)',
    description: 'Update mutable image metadata such as originalFilename label.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'File upload ID',
    example: 1,
  })
  @ApiBody({
    description: 'Fields to update',
    type: UpdateUploadDto,
  })
  @ApiResponse({ status: 200, description: 'Image updated', type: UploadResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'File with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUploadDto,
  ): Promise<UploadResponseDto> {
    return await this.uploadService.updateMetadata(id, dto);
  }


  @Delete('image/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an image file and database record',
    description:
      'Permanently deletes the image file from disk and soft-deletes the database record',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'File upload ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      example: {
        message: 'Image deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'File with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Image is referenced by one or more products',
    schema: {
      example: {
        statusCode: 409,
        message: 'Image is referenced by 2 product(s)',
        details: { productIds: [1, 2] },
        error: 'Conflict',
      },
    },
  })
  async deleteImage(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.uploadService.remove(id);
    return { message: 'Image deleted successfully' };

  }
}
