import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { ApproveLoanRequestDto } from './dto/approve-loan-request.dto';
import { AdminInstallmentFilterDto } from './dto/admin-installment-filter.dto';
import { ConfirmInstallmentPaymentDto } from './dto/confirm-installment-payment.dto';
import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { LoanRequestFilterDto } from './dto/loan-request-filter.dto';
import {
  AdminLoanRequestResponseDto,
  AdminLoanResponseDto,
  AdminUserResponseDto,
  ConfirmInstallmentPaymentResponseDto,
  LoanApprovalResponseDto,
  MyInstallmentResponseDto,
  MyLoanRequestResponseDto,
  MyLoanResponseDto,
  PaginatedAdminInstallmentResponseDto,
  LoanRequestResponseDto,
} from './dto/loan-responses.dto';
import { RejectLoanRequestDto } from './dto/reject-loan-request.dto';
import { LoansService } from './loans.service';

@ApiTags('Loan Requests')
@Controller()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('loan-requests/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت درخواست‌های وام کاربر جاری' })
  @ApiOkResponse({ type: MyLoanRequestResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط کاربر عادی مجاز است.' })
  getMyRequests(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyLoanRequestResponseDto[]> {
    return this.loansService.getMyRequests(user);
  }

  @Get('loans/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت وام‌های کاربر جاری' })
  @ApiOkResponse({ type: MyLoanResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط کاربر عادی مجاز است.' })
  getMyLoans(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyLoanResponseDto[]> {
    return this.loansService.getMyLoans(user);
  }

  @Get('loans/:id/installments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت اقساط وام متعلق به کاربر جاری' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MyInstallmentResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'شناسه وام معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'وام یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط کاربر عادی مجاز است.' })
  getMyInstallments(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه وام معتبر نیست.'),
      }),
    )
    loanId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyInstallmentResponseDto[]> {
    return this.loansService.getMyInstallments(loanId, user);
  }

  @Post('loan-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد درخواست وام' })
  @ApiCreatedResponse({ type: LoanRequestResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات درخواست معتبر نیست.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({
    description: 'فقط کاربر عادی مجاز به ایجاد درخواست است.',
  })
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLoanRequestDto,
  ): Promise<LoanRequestResponseDto> {
    return this.loansService.createRequest(user, dto);
  }

  @Get('admin/loan-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فهرست درخواست‌های وام برای مدیر' })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'approved', 'rejected'],
    required: false,
  })
  @ApiOkResponse({ type: AdminLoanRequestResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'وضعیت درخواست معتبر نیست.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminRequests(
    @Query() filter: LoanRequestFilterDto,
  ): Promise<AdminLoanRequestResponseDto[]> {
    return this.loansService.getAdminRequests(filter);
  }

  @Get('admin/loan-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت جزئیات درخواست وام برای مدیر' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminLoanRequestResponseDto })
  @ApiBadRequestResponse({ description: 'شناسه درخواست معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'درخواست وام یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminRequest(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه درخواست معتبر نیست.'),
      }),
    )
    requestId: string,
  ): Promise<AdminLoanRequestResponseDto> {
    return this.loansService.getAdminRequest(requestId);
  }

  @Get('admin/loans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فهرست وام‌ها برای مدیر' })
  @ApiOkResponse({ type: AdminLoanResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminLoans(): Promise<AdminLoanResponseDto[]> {
    return this.loansService.getAdminLoans();
  }

  @Get('admin/loans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت جزئیات وام و اقساط برای مدیر' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminLoanResponseDto })
  @ApiBadRequestResponse({ description: 'شناسه وام معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'وام یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminLoan(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه وام معتبر نیست.'),
      }),
    )
    loanId: string,
  ): Promise<AdminLoanResponseDto> {
    return this.loansService.getAdminLoan(loanId);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فهرست کاربران برای مدیر' })
  @ApiOkResponse({ type: AdminUserResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminUsers(): Promise<AdminUserResponseDto[]> {
    return this.loansService.getAdminUsers();
  }

  @Patch('admin/loan-requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تأیید درخواست و ایجاد وام و اقساط' })
  @ApiOkResponse({ type: LoanApprovalResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات وام معتبر نیست.' })
  @ApiConflictResponse({ description: 'این درخواست قبلاً بررسی شده است.' })
  @ApiNotFoundResponse({ description: 'درخواست وام یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط ادمین مجاز به تأیید درخواست است.' })
  approveRequest(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه درخواست معتبر نیست.'),
      }),
    )
    requestId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ApproveLoanRequestDto,
  ): Promise<LoanApprovalResponseDto> {
    return this.loansService.approveRequest(requestId, admin, dto);
  }

  @Patch('admin/loan-requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رد درخواست وام' })
  @ApiOkResponse({ type: LoanRequestResponseDto })
  @ApiConflictResponse({ description: 'این درخواست قبلاً بررسی شده است.' })
  @ApiNotFoundResponse({ description: 'درخواست وام یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط ادمین مجاز به رد درخواست است.' })
  rejectRequest(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه درخواست معتبر نیست.'),
      }),
    )
    requestId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: RejectLoanRequestDto,
  ): Promise<LoanRequestResponseDto> {
    return this.loansService.rejectRequest(requestId, admin, dto);
  }

  @Get('admin/installments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فهرست صفحه‌بندی‌شده اقساط برای مدیر' })
  @ApiQuery({ name: 'status', enum: ['pending', 'overdue'], required: false })
  @ApiQuery({
    name: 'dueBefore',
    type: String,
    required: false,
    example: '2026-10-08',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiOkResponse({ type: PaginatedAdminInstallmentResponseDto })
  @ApiBadRequestResponse({
    description: 'فیلتر یا پارامترهای صفحه‌بندی معتبر نیستند.',
  })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  getAdminInstallments(
    @Query() filter: AdminInstallmentFilterDto,
  ): Promise<PaginatedAdminInstallmentResponseDto> {
    return this.loansService.getAdminInstallments(filter);
  }

  @Patch('admin/installments/:id/confirm-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت تأیید دستی پرداخت قسط توسط مدیر' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: ConfirmInstallmentPaymentDto, required: false })
  @ApiOkResponse({ type: ConfirmInstallmentPaymentResponseDto })
  @ApiBadRequestResponse({
    description: 'شناسه قسط یا زمان پرداخت معتبر نیست.',
  })
  @ApiConflictResponse({ description: 'این قسط قبلاً پرداخت شده است.' })
  @ApiNotFoundResponse({ description: 'قسط یا وام مربوط به آن پیدا نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({
    description: 'فقط مدیر سیستم مجاز به تأیید پرداخت است.',
  })
  confirmInstallmentPayment(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه قسط معتبر نیست.'),
      }),
    )
    installmentId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto?: ConfirmInstallmentPaymentDto,
  ): Promise<ConfirmInstallmentPaymentResponseDto> {
    return this.loansService.confirmInstallmentPayment(
      installmentId,
      admin,
      dto,
    );
  }
}
