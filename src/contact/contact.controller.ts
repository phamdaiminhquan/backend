import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../enums/user.enum';

interface RequestWithUser extends Request {
  user?: { id: number };
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact or feedback message' })
  @ApiResponse({ status: 201, description: 'Contact message recorded' })
  async create(@Body() dto: CreateContactDto, @Req() request: RequestWithUser) {
    const userId = request.user?.id;
    return this.contactService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contact and feedback messages (admin/staff only)' })
  @ApiResponse({ status: 200, description: 'List of contact messages' })
  async findAll(@Query() filter: FilterContactDto) {
    return this.contactService.findAll(filter);
  }
}
