import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { RevenueReportDto } from './dto/revenue-report.dto';

@ApiTags('revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily revenue report for a specific date' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Report date in YYYY-MM-DD format (defaults to today)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily revenue report',
    type: RevenueReportDto,
  })
  async getDailyRevenue(@Query('date') date?: string) {
    const reportDate = date ? new Date(date) : new Date();
    return this.revenueService.getDailyRevenue(reportDate);
  }

  @Get('range')
  @ApiOperation({ summary: 'Get revenue reports for a date range' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date in YYYY-MM-DD format (inclusive)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date in YYYY-MM-DD format (inclusive)',
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue reports for the date range',
    type: [RevenueReportDto],
  })
  async getRevenueRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.revenueService.getRevenueRange(new Date(startDate), new Date(endDate));
  }
}

