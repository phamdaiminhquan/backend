import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepository: Repository<ContactMessage>,
  ) {}

  async create(dto: CreateContactDto, userId?: number): Promise<ContactMessage> {
    const contact = this.contactRepository.create({ ...dto, userId });
    return this.contactRepository.save(contact);
  }

  async findAll(filter: FilterContactDto): Promise<ContactMessage[]> {
    return this.contactRepository.find({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }
}
