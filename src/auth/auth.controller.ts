import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات ثبت‌نام معتبر نیست.' })
  @ApiConflictResponse({
    description: 'کد ملی یا شماره موبایل قبلاً ثبت شده است.',
  })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'ورود با شماره موبایل یا کد ملی' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'اطلاعات ورود معتبر نیست.' })
  @ApiUnauthorizedResponse({
    description: 'اطلاعات ورود یا وضعیت حساب معتبر نیست.',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'تمدید توکن‌ها و ابطال refresh token قبلی' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'رفرش توکن معتبر نیست یا قبلاً مصرف شده است.',
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'دریافت اطلاعات کاربر جاری' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'احراز هویت الزامی است.' })
  me(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getProfile(currentUser.userId);
  }
}
