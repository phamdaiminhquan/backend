import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { MergeToUserDto } from './dto/merge-to-user.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new customer' })
  @ApiBody({ type: CreateCustomerDto })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers with pagination and search' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or phone' })
  list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.customersService.findAll({ page: Number(page), limit: Number(limit), search });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers by name or phone for order creation' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'phone', required: false })
  search(@Query('name') name?: string, @Query('phone') phone?: string) {
    return this.customersService.search({ name, phone });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details with order history and reward points' })
  @ApiParam({ name: 'id', example: 1 })
  get(@Param('id') id: string) {
    return this.customersService.findOneWithDetails(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer info' })
  @ApiParam({ name: 'id', example: 1 })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete customer' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id') id: string) {
    return this.customersService.softDelete(+id);
  }

  @Post(':id/merge-to-user')
  @ApiOperation({ summary: 'Merge customer into existing user account (admin-initiated)' })
  @ApiParam({ name: 'id', example: 1 })
  mergeToUser(@Param('id') id: string, @Body() dto: MergeToUserDto) {
    return this.customersService.mergeToUser(+id, dto);
  }
}

