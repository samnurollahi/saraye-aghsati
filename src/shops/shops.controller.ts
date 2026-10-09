import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopPaginationDto } from './dto/shop-pagination.dto';
import {
  PaginatedShopResponseDto,
  PublicShopResponseDto,
  ShopQrResponseDto,
  ShopResponseDto,
} from './dto/shop-response.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopSetupTokenResponseDto } from './dto/shop-auth-response.dto';
import { ShopAuthService } from './shop-auth.service';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@Controller()
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly shopAuthService: ShopAuthService,
  ) {}

  @Post('admin/shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ایجاد فروشگاه' })
  @ApiBody({ type: CreateShopDto })
  @ApiCreatedResponse({ type: ShopResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات فروشگاه معتبر نیست.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  create(@Body() dto: CreateShopDto): Promise<ShopResponseDto> {
    return this.shopsService.create(dto);
  }

  @Post('admin/shops/:id/credentials/setup-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'صدور توکن یک‌بارمصرف تنظیم رمز اولیه برای فروشگاه',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ShopSetupTokenResponseDto })
  @ApiBadRequestResponse({ description: 'شناسه فروشگاه معتبر نیست.' })
  @ApiConflictResponse({
    description: 'فروشگاه غیرفعال، دارای رمز، یا دارای شماره ورود تکراری است.',
  })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط مدیر سیستم مجاز است.' })
  provisionCredentials(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه فروشگاه معتبر نیست.'),
      }),
    )
    id: string,
  ): Promise<ShopSetupTokenResponseDto> {
    return this.shopAuthService.provisionCredentials(id);
  }

  @Get('admin/shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فهرست فروشگاه‌ها با صفحه‌بندی' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: PaginatedShopResponseDto })
  @ApiBadRequestResponse({ description: 'پارامترهای صفحه‌بندی معتبر نیستند.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  list(
    @Query() pagination: ShopPaginationDto,
  ): Promise<PaginatedShopResponseDto> {
    return this.shopsService.list(pagination);
  }

  @Patch('admin/shops/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ویرایش اطلاعات یا وضعیت فروشگاه' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateShopDto })
  @ApiOkResponse({ type: ShopResponseDto })
  @ApiBadRequestResponse({
    description: 'شناسه یا اطلاعات فروشگاه معتبر نیست.',
  })
  @ApiNotFoundResponse({ description: 'فروشگاه یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  update(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه فروشگاه معتبر نیست.'),
      }),
    )
    id: string,
    @Body() dto: UpdateShopDto,
  ): Promise<ShopResponseDto> {
    return this.shopsService.update(id, dto);
  }

  @Delete('admin/shops/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف نرم فروشگاه' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'فروشگاه حذف شد.' })
  @ApiBadRequestResponse({ description: 'شناسه فروشگاه معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'فروشگاه یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  async remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه فروشگاه معتبر نیست.'),
      }),
    )
    id: string,
  ): Promise<{ message: string }> {
    await this.shopsService.remove(id);
    return { message: 'فروشگاه حذف شد.' };
  }

  @Get('admin/shops/:id/qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت تصویر QR فروشگاه' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ShopQrResponseDto })
  @ApiBadRequestResponse({ description: 'شناسه فروشگاه معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'فروشگاه یافت نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'دسترسی فقط برای مدیر سیستم مجاز است.' })
  async getQr(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه فروشگاه معتبر نیست.'),
      }),
    )
    id: string,
  ): Promise<ShopQrResponseDto> {
    return { qrCode: await this.shopsService.createQrCode(id) };
  }

  @Get('shops/scan/:qrCodeToken')
  @ApiOperation({ summary: 'دریافت اطلاعات عمومی فروشگاه از QR' })
  @ApiParam({ name: 'qrCodeToken', description: 'توکن تصادفی داخل QR' })
  @ApiOkResponse({ type: PublicShopResponseDto })
  @ApiNotFoundResponse({ description: 'فروشگاه فعال یافت نشد.' })
  scan(@Param('qrCodeToken') token: string): Promise<PublicShopResponseDto> {
    return this.shopsService.scan(token);
  }
}
