import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { UploadResponseDto } from './dto/upload-response.dto';
import { ListImagesQueryDto } from './dto/list-images-query.dto';
import { ListImagesResponseDto } from './dto/list-images-response.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { Product } from '../products/entities/product.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = 'uploads';
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {
    // Set base URL from environment or default
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  /**
   * Ensure the upload directory exists
   */
  private ensureUploadDirExists(): void {
    const uploadPath = path.join(process.cwd(), this.uploadDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  }

  /**
   * Save file upload metadata to database
   */
  async saveFileMetadata(
    file: Express.Multer.File,
    savedFilename: string,
    uploadedBy?: number,
  ): Promise<UploadResponseDto> {
    try {
      const fileUpload = this.fileUploadRepository.create({
        originalFilename: file.originalname,
        savedFilename: savedFilename,
        filepath: `${this.uploadDir}/${savedFilename}`,
        filesize: file.size,
        mimetype: file.mimetype,
        uploadedBy: uploadedBy,
      });

      const savedFile = await this.fileUploadRepository.save(fileUpload);

      return this.mapToResponseDto(savedFile);
    } catch (error) {
      // If database save fails, delete the uploaded file
      const filePath = path.join(process.cwd(), this.uploadDir, savedFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new InternalServerErrorException('Failed to save file metadata');
    }
  }

  /**
   * Get all uploaded images
   */
  async findAll(): Promise<UploadResponseDto[]> {
    const files = await this.fileUploadRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return files.map((file) => this.mapToResponseDto(file));
  }

  /**
   * Get specific image metadata by ID
   */
  async findOne(id: number): Promise<UploadResponseDto> {
    const file = await this.fileUploadRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return this.mapToResponseDto(file);
  }

  /**
   * Delete image file and database record
   */
  async remove(id: number): Promise<void> {
    const file = await this.fileUploadRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    // Reject deletion if image is referenced by any product (not soft-deleted)
    const referencingProducts = await this.productsRepository.find({
      where: { image: file.filepath, deletedAt: IsNull() },
      select: ['id'],
    });
    if (referencingProducts.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        message: `Image is referenced by ${referencingProducts.length} product(s)`,
        details: { productIds: referencingProducts.map((p) => p.id) },
      });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), file.filepath);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
      // Continue with database deletion even if file deletion fails
    }

    // Soft delete in database
    file.deletedAt = new Date();
    await this.fileUploadRepository.save(file);
  }

  /**
   * Map FileUpload entity to UploadResponseDto
   */
  private mapToResponseDto(file: FileUpload): UploadResponseDto {
    return {
      id: file.id,
      originalFilename: file.originalFilename,
      savedFilename: file.savedFilename,
      filepath: file.filepath,
      url: file.getUrl(this.baseUrl),
      filesize: file.filesize,
      mimetype: file.mimetype,
      createdAt: file.createdAt,
    };
  }

  /**
   * Validate file exists and is accessible
   */
  async validateFileExists(id: number): Promise<boolean> {
    const file = await this.fileUploadRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!file) {
      return false;
    }
    const filePath = path.join(process.cwd(), file.filepath);
    return fs.existsSync(filePath);
  }


  /**
   * Parse sort parameter in the form field:direction
   */
  private parseSortParam(sort?: string): { column: string; direction: 'ASC' | 'DESC' } {
    const fallback = { column: 'f.createdAt', direction: 'DESC' as const };
    if (!sort) return fallback;
    const [field, dirRaw] = sort.split(':');
    const direction = (dirRaw || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch ((field || '').toString()) {
      case 'originalFilename':
        return { column: 'f.originalFilename', direction };
      case 'savedFilename':
        return { column: 'f.savedFilename', direction };
      case 'filesize':
        return { column: 'f.filesize', direction };
      case 'createdAt':
        return { column: 'f.createdAt', direction };
      default:
        return fallback;
    }
  }

  /**
   * List images with pagination, search and date filtering
   */
  async findAllPaginated(query: ListImagesQueryDto): Promise<ListImagesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const qb = this.fileUploadRepository.createQueryBuilder('f')
      .where('f.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(f.originalFilename ILIKE :search OR f.savedFilename ILIKE :search OR f.filepath ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.dateFrom) {
      qb.andWhere('f.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      qb.andWhere('f.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    const { column, direction } = this.parseSortParam(query.sort);
    qb.orderBy(column, direction).skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((f) => this.mapToResponseDto(f)),
      page,
      limit,
      total,
    };
  }

  /**
   * List images that are not referenced by any active entities (e.g., Product.image)
   */
  async findUnusedPaginated(query: ListImagesQueryDto): Promise<ListImagesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const qb = this.fileUploadRepository.createQueryBuilder('f')
      .where('f.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(f.originalFilename ILIKE :search OR f.savedFilename ILIKE :search OR f.filepath ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.dateFrom) {
      qb.andWhere('f.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      qb.andWhere('f.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    // Exclude images referenced by products (not soft-deleted)
    const sub = qb.subQuery()
      .select('1')
      .from(Product, 'p')
      .where('p.image = f.filepath')
      .andWhere('p.deletedAt IS NULL')
      .getQuery();

    qb.andWhere(`NOT EXISTS ${sub}`);

    const { column, direction } = this.parseSortParam(query.sort);
    qb.orderBy(column, direction).skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((f) => this.mapToResponseDto(f)),
      page,
      limit,
      total,
    };
  }

  /**
   * Update image metadata
   */
  async updateMetadata(id: number, dto: UpdateUploadDto): Promise<UploadResponseDto> {
    const file = await this.fileUploadRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    if (typeof dto.originalFilename === 'string' && dto.originalFilename.trim().length > 0) {
      file.originalFilename = dto.originalFilename.trim();
    }

    const saved = await this.fileUploadRepository.save(file);
    return this.mapToResponseDto(saved);
  }

}

