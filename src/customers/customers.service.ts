import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Not, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { MergeToUserDto } from './dto/merge-to-user.dto';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  private normalizePhone(phone?: string) {
    return phone?.trim() || undefined;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const phone = this.normalizePhone(dto.phoneNumber);

    if (phone) {
      // Check uniqueness across customers and users
      const [existingCustomer, existingUser] = await Promise.all([
        this.customersRepo.findOne({ where: { phoneNumber: phone, deletedAt: IsNull() } }),
        this.usersRepo.findOne({ where: { phone } }),
      ]);
      if (existingCustomer) {
        throw new BadRequestException('Phone number already exists for another customer');
      }
      if (existingUser) {
        throw new BadRequestException('Phone number already exists for a registered user');
      }
    }

    const customer = this.customersRepo.create({
      name: dto.name.trim(),
      phoneNumber: phone ?? null,
      image: dto.image ?? null,
    });
    return this.customersRepo.save(customer);
  }

  async findAll(params: { page?: number; limit?: number; search?: string }): Promise<{ data: Customer[]; page: number; limit: number; total: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.customersRepo.createQueryBuilder('c').where('c.deletedAt IS NULL');

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(c.name) LIKE :q OR c.phoneNumber ILIKE :q)', { q });
    }

    const [data, total] = await qb.orderBy('c.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();
    return { data, page, limit, total };
  }

  async findOneWithDetails(id: number): Promise<CustomerResponseDto> {
    const customer = await this.customersRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!customer) throw new NotFoundException('Customer not found');

    const orders = await this.ordersRepo.find({ where: { customerId: id, deletedAt: IsNull() }, order: { createdAt: 'DESC' } });
    const ordersSummary = orders.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      paymentMethod: o.paymentMethod ?? null,
      total: (o as any).orderDetails ? (o as any).orderDetails.reduce((s: number, d: any) => s + Number(d.subtotal), 0) : 0,
    }));

    return {
      id: customer.id,
      name: customer.name,
      phoneNumber: customer.phoneNumber ?? null,
      image: customer.image ?? null,
      rewardPoints: customer.rewardPoints,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      orders: ordersSummary,
    };
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.customersRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.phoneNumber !== undefined) {
      const phone = this.normalizePhone(dto.phoneNumber) ?? null;
      if (phone) {
        const [existingCustomer, existingUser] = await Promise.all([
          this.customersRepo.findOne({ where: { phoneNumber: phone, id: Not(id), deletedAt: IsNull() } }),
          this.usersRepo.findOne({ where: { phone } }),
        ]);
        if (existingCustomer) throw new BadRequestException('Phone number already exists for another customer');
        if (existingUser) throw new BadRequestException('Phone number already exists for a registered user');
      }
      customer.phoneNumber = phone;
    }

    if (dto.name !== undefined) customer.name = dto.name.trim();
    if (dto.image !== undefined) customer.image = dto.image;

    return this.customersRepo.save(customer);
  }

  async softDelete(id: number): Promise<void> {
    const customer = await this.customersRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!customer) throw new NotFoundException('Customer not found');
    customer.deletedAt = new Date();
    await this.customersRepo.save(customer);
  }

  async search(params: { name?: string; phone?: string }): Promise<Customer[]> {
    const name = params.name?.trim();
    const phone = this.normalizePhone(params.phone);

    const where: any = { deletedAt: IsNull() };

    // Build dynamic conditions using QueryBuilder for OR logic
    const qb = this.customersRepo.createQueryBuilder('c').where('c.deletedAt IS NULL');
    if (phone) {
      qb.andWhere('c.phoneNumber = :phone', { phone });
    }
    if (name) {
      qb.andWhere('LOWER(c.name) LIKE :name', { name: `%${name.toLowerCase()}%` });
    }

    return qb.orderBy('c.createdAt', 'DESC').take(20).getMany();
  }

  async mergeToUser(customerId: number, dto: MergeToUserDto): Promise<{ merged: boolean; message: string; userId?: number }> {
    const customer = await this.customersRepo.findOne({ where: { id: customerId, deletedAt: IsNull() } });
    if (!customer) throw new NotFoundException('Customer not found');

    const phone = this.normalizePhone(dto.phone);
    if (!phone) throw new BadRequestException('Phone is required');

    const user = await this.usersRepo.findOne({ where: { phone } });
    if (!user) {
      // No user exists -> just update customer's phone normally
      customer.phoneNumber = phone;
      await this.customersRepo.save(customer);
      return { merged: false, message: 'Phone updated for customer (no existing user found)' };
    }

    if (!dto.confirmMerge) {
      return { merged: false, message: 'A user with this phone exists. Set confirmMerge=true to merge.', userId: user.id };
    }

    // Perform transactional merge: move orders to user, transfer points, soft-delete customer
    await this.customersRepo.manager.transaction(async (manager) => {
      // Move orders
      await manager.getRepository(Order).createQueryBuilder()
        .update()
        .set({ userId: user.id, customerId: null as any })
        .where('customerId = :cid', { cid: customer.id })
        .execute();

      // Increase user's reward points by customer's points
      if (customer.rewardPoints && customer.rewardPoints > 0) {
        user.rewardPoints += customer.rewardPoints;
        await manager.getRepository(User).save(user);
      }

      // Move reward transactions (will rely on customerId column added in rewards)
      const rtRepo = manager.getRepository<any>('reward_transactions');
      await rtRepo.createQueryBuilder()
        .update()
        .set({ userId: user.id, customerId: null })
        .where('customerId = :cid', { cid: customer.id })
        .execute();

      // Soft-delete the customer
      customer.deletedAt = new Date();
      await manager.getRepository(Customer).save(customer);
    });

    return { merged: true, message: 'Customer merged into existing user and soft-deleted', userId: user.id };
  }
}

