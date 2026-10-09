import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import type { AuthenticatedShop } from '../auth/auth.types';
import { CurrentShop } from './decorators/current-shop.decorator';
import { ShopJwtAuthGuard } from './guards/shop-jwt-auth.guard';
import { ShopAuthService } from './shop-auth.service';
import { ShopLoginDto } from './dto/shop-login.dto';
import { SetShopPasswordDto } from './dto/set-shop-password.dto';
import { TransactionPaginationDto } from '../transactions/dto/transaction-pagination.dto';
import {
  PaginatedShopTransactionResponseDto,
  ShopAuthResponseDto,
  ShopDashboardResponseDto,
  ShopProfileResponseDto,
} from './dto/shop-auth-response.dto';

@ApiTags('Shop Auth')
@Controller('shop-auth')
export class ShopAuthController {
  constructor(private readonly shopAuthService: ShopAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'ورود مستقل فروشگاه با شماره موبایل و رمز عبور' })
  @ApiBody({ type: ShopLoginDto })
  @ApiOkResponse({ type: ShopAuthResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات ورود معتبر نیست.' })
  @ApiUnauthorizedResponse({ description: 'اطلاعات ورود فروشگاه معتبر نیست.' })
  login(@Body() dto: ShopLoginDto): Promise<ShopAuthResponseDto> {
    return this.shopAuthService.login(dto);
  }

  @Post('setup-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'تنظیم رمز اولیه با توکن یک‌بارمصرف مدیر' })
  @ApiBody({ type: SetShopPasswordDto })
  @ApiOkResponse({
    schema: { example: { message: 'رمز عبور فروشگاه با موفقیت تنظیم شد.' } },
  })
  @ApiBadRequestResponse({ description: 'توکن یا رمز عبور معتبر نیست.' })
  @ApiUnauthorizedResponse({
    description: 'توکن نامعتبر، منقضی یا مصرف‌شده است.',
  })
  setPassword(@Body() dto: SetShopPasswordDto): Promise<{ message: string }> {
    return this.shopAuthService.setPassword(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'تمدید توکن فروشگاه و چرخش refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: ShopAuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'رفرش توکن نامعتبر یا قبلاً مصرف شده است.',
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<ShopAuthResponseDto> {
    return this.shopAuthService.refresh(dto);
  }

  @Get('me')
  @UseGuards(ShopJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت پروفایل فروشگاه احراز هویت‌شده' })
  @ApiOkResponse({ type: ShopProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'توکن نامعتبر یا حساب غیرفعال است.' })
  me(@CurrentShop() shop: AuthenticatedShop): Promise<ShopProfileResponseDto> {
    return this.shopAuthService.getProfile(shop.shopId);
  }

  @Get('dashboard')
  @UseGuards(ShopJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'خلاصه تراکنش‌های تکمیل‌شده فروشگاه جاری' })
  @ApiOkResponse({ type: ShopDashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'توکن نامعتبر یا حساب غیرفعال است.' })
  dashboard(
    @CurrentShop() shop: AuthenticatedShop,
  ): Promise<ShopDashboardResponseDto> {
    return this.shopAuthService.getDashboard(shop.shopId);
  }

  @Get('transactions')
  @UseGuards(ShopJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تاریخچه صفحه‌بندی‌شده تراکنش‌های فروشگاه جاری' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: PaginatedShopTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'پارامترهای صفحه‌بندی معتبر نیستند.' })
  @ApiUnauthorizedResponse({ description: 'توکن نامعتبر یا حساب غیرفعال است.' })
  transactions(
    @CurrentShop() shop: AuthenticatedShop,
    @Query() pagination: TransactionPaginationDto,
  ): Promise<PaginatedShopTransactionResponseDto> {
    return this.shopAuthService.getTransactions(shop.shopId, pagination);
  }
}
