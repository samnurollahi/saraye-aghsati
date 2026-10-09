import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { NotificationPaginationDto } from './dto/notification-pagination.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت اعلان‌های کاربر جاری با صفحه‌بندی' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: PaginatedNotificationResponseDto })
  @ApiBadRequestResponse({ description: 'پارامترهای صفحه‌بندی معتبر نیستند.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط کاربر عادی مجاز است.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: NotificationPaginationDto,
  ): Promise<PaginatedNotificationResponseDto> {
    return this.notificationsService.list(user, pagination);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'علامت‌گذاری اعلان متعلق به کاربر جاری به‌عنوان خوانده‌شده',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiBadRequestResponse({ description: 'شناسه اعلان معتبر نیست.' })
  @ApiNotFoundResponse({ description: 'اعلان موردنظر پیدا نشد.' })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  @ApiForbiddenResponse({ description: 'فقط کاربر عادی مجاز است.' })
  markAsRead(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('شناسه اعلان معتبر نیست.'),
      }),
    )
    notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(notificationId, user);
  }
}
