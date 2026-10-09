import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ShopPaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'شماره صفحه باید عدد صحیح باشد.' })
  @Min(1, { message: 'شماره صفحه باید حداقل ۱ باشد.' })
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'تعداد در هر صفحه باید عدد صحیح باشد.' })
  @Min(1, { message: 'تعداد در هر صفحه باید حداقل ۱ باشد.' })
  @Max(100, { message: 'تعداد در هر صفحه نمی‌تواند بیشتر از ۱۰۰ باشد.' })
  limit = 20;
}
