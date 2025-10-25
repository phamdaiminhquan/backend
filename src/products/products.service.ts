import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private categoriesService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Verify category exists
    await this.categoriesService.findOne(createProductDto.categoryId);

    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(categoryId?: number): Promise<Product[]> {
    const query = this.productsRepository.createQueryBuilder('product')
      .where('product.deletedAt IS NULL');

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    return query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    await this.findOne(id); // Check if exists

    if (updateProductDto.categoryId !== undefined) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    await this.productsRepository.update(id, updateProductDto);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.update(id, { deletedAt: new Date() });
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }
}

