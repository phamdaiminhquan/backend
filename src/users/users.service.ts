import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../enums/user.enum';

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
  ) {}

  async create(params: CreateUserParams): Promise<User> {
    const user = this.usersRepository.create({
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      fullName: params.fullName,
      phone: params.phone,
      role: params.role ?? UserRole.CUSTOMER,
    });

    return this.usersRepository.save(user);
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
