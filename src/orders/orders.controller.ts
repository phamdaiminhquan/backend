import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../enums/user.enum';
import { isAuthDisabled } from '../common/utils/auth-bypass.util';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private isStaffOrAdmin(role?: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.STAFF;
  }

  private getRequestUser(request: Request): { id?: number; role?: UserRole } | null {
    const { user } = request as Request & { user?: { id?: number; role?: UserRole } };

    if (user?.id) {
      return user;
    }

    if (isAuthDisabled()) {
      return user ?? null;
    }

    throw new ForbiddenException();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order with order details' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or products not found' })
  create(@Req() request: Request, @Body() createOrderDto: CreateOrderDto) {
    const user = this.getRequestUser(request);
    return this.ordersService.create({ ...createOrderDto, userId: user?.id });
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders of the current user' })
  @ApiResponse({ status: 200, description: 'List of the current user orders' })
  findMyOrders(@Req() request: Request) {
    const user = this.getRequestUser(request);

    if (!user?.id) {
      return this.ordersService.findAll();
    }

    return this.ordersService.findAll({ userId: user.id });
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all orders (admin/staff only) with optional customer search' })
  @ApiQuery({
    name: 'customerName',
    required: false,
    description: 'Filter orders by customer name (partial match)',
    example: 'Nguyễn',
  })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  findAll(@Query('customerName') customerName?: string) {
    return this.ordersService.findAll({ customerName });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID with all details' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Order found with order details and products' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Req() request: Request, @Param('id') id: string) {
    const user = this.getRequestUser(request);
    const order = await this.ordersService.findOne(+id);

    if (
      user?.id &&
      order.userId &&
      order.userId !== user.id &&
      !this.isStaffOrAdmin(user.role)
    ) {
      throw new ForbiddenException();
    }

    return order;
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update order status (admin/staff only)' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 1 })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Cancellation reason required when status is cancelled' })
  updateStatus(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an order (admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}

