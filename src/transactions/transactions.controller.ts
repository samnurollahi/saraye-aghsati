import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionPaginationDto } from './dto/transaction-pagination.dto';
import {
  CreateTransactionResponseDto,
  PaginatedTransactionResponseDto,
} from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'پرداخت از اعتبار وام به فروشگاه' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({ type: CreateTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'مبلغ یا اطلاعات درخواست معتبر نیست.' })
  @ApiUnauthorizedResponse({ description: 'توکن معتبر الزامی است.' })
  @ApiForbiddenResponse({ description: 'این عملیات فقط برای کاربر مجاز است.' })
  @ApiNotFoundResponse({ description: 'فروشگاه فعال یافت نشد.' })
  @ApiConflictResponse({ description: 'وام فعال یا موجودی کافی وجود ندارد.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<CreateTransactionResponseDto> {
    return this.transactionsService.create(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'فهرست صفحه‌بندی‌شده تراکنش‌های کاربر جاری' })
  @ApiOkResponse({ type: PaginatedTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'پارامترهای صفحه‌بندی معتبر نیستند.' })
  @ApiUnauthorizedResponse({ description: 'توکن معتبر الزامی است.' })
  @ApiForbiddenResponse({ description: 'این عملیات فقط برای کاربر مجاز است.' })
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: TransactionPaginationDto,
  ): Promise<PaginatedTransactionResponseDto> {
    return this.transactionsService.getMyTransactions(user, pagination);
  }
}
