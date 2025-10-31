import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../enums/user.enum';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get high-level dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  getDashboard() {
    return this.statsService.getDashboard();
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales totals by day within a range' })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD (default: 7 days ago)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD (default: today)' })
  @ApiResponse({ status: 200, description: 'Daily sales totals' })
  getSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getSales(startDate, endDate);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products by quantity and revenue' })
  getTopProducts() {
    return this.statsService.getTopProducts();
  }
}
