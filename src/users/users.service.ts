import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../enums/user.enum';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { RewardTransaction } from '../rewards/entities/reward-transaction.entity';

interface CreateUserParams {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
}

interface UpdateUserProfileParams {
  fullName?: string;
  phone?: string;
  passwordHash?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(params: CreateUserParams): Promise<User> {
    const normalizedPhone = params.phone?.trim();

    // Pre-check for existing customer with same phone (active)
    let existingCustomer: Customer | null = null;
    if (normalizedPhone) {
      existingCustomer = await this.customersRepository.findOne({ where: { phoneNumber: normalizedPhone, deletedAt: IsNull() } });

      // Enforce phone uniqueness across users as well
      const existingUser = await this.usersRepository.findOne({ where: { phone: normalizedPhone } });
      if (existingUser) {
        throw new BadRequestException('Phone number already exists for a registered user');
      }
    }

    const user = this.usersRepository.create({
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      fullName: params.fullName,
      phone: normalizedPhone,
      role: params.role ?? UserRole.CUSTOMER,
    });

    const savedUser = await this.usersRepository.save(user);

    // Auto-migrate data if there is a matching customer by phone
    if (existingCustomer) {
      await this.usersRepository.manager.transaction(async (manager) => {
        const ordersRepo = manager.getRepository(Order);
        const usersRepo = manager.getRepository(User);
        const customersRepo = manager.getRepository(Customer);
        const rewardRepo = manager.getRepository(RewardTransaction);

        // Transfer orders: set userId and clear customerId
        await ordersRepo
          .createQueryBuilder()
          .update()
          .set({ userId: savedUser.id, customerId: null as any })
          .where('customerId = :cid', { cid: existingCustomer!.id })
          .execute();

        // Transfer reward points from customer to user
        if (existingCustomer!.rewardPoints && existingCustomer!.rewardPoints > 0) {
          const reloadedUser = await usersRepo.findOne({ where: { id: savedUser.id } });
          if (reloadedUser) {
            reloadedUser.rewardPoints += existingCustomer!.rewardPoints;
            await usersRepo.save(reloadedUser);
          }
        }

        // Move reward transactions to user
        await rewardRepo
          .createQueryBuilder()
          .update()
          .set({ userId: savedUser.id, customerId: null })
          .where('customerId = :cid', { cid: existingCustomer!.id })
          .execute();

        // Soft-delete customer
        existingCustomer!.deletedAt = new Date();
        await customersRepo.save(existingCustomer!);
      });
    }

    return savedUser;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async mustFindById(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateProfile(id: number, changes: UpdateUserProfileParams): Promise<User> {
    const user = await this.mustFindById(id);

    if (changes.fullName !== undefined) {
      user.fullName = changes.fullName;
    }

    if (changes.phone !== undefined) {
      user.phone = changes.phone;
    }

    if (changes.passwordHash !== undefined) {
      user.passwordHash = changes.passwordHash;
    }

    return this.usersRepository.save(user);
  }

  async updateRefreshTokenHash(id: number, refreshTokenHash: string | null): Promise<void> {
    await this.usersRepository.update(id, { refreshTokenHash });
  }

  async setRewardPoints(id: number, rewardPoints: number): Promise<User> {
    const user = await this.mustFindById(id);
    user.rewardPoints = rewardPoints;
    return this.usersRepository.save(user);
  }

  async adjustRewardPoints(id: number, delta: number): Promise<User> {
    const user = await this.mustFindById(id);
    user.rewardPoints += delta;
    if (user.rewardPoints < 0) {
      user.rewardPoints = 0;
    }
    return this.usersRepository.save(user);
  }
}
