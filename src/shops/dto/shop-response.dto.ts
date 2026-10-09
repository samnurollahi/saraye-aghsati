import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ownerName!: string;

  @ApiProperty({ example: '09120000000' })
  phone!: string;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PublicShopResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ownerName!: string;

  @ApiProperty({ example: '09120000000' })
  phone!: string;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}

export class PaginatedShopResponseDto {
  @ApiProperty({ type: ShopResponseDto, isArray: true })
  items!: ShopResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class ShopQrResponseDto {
  @ApiProperty({
    description:
      'تصویر PNG به‌صورت data URL؛ محتوای QR فقط qrCodeToken فروشگاه است.',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  qrCode!: string;
}
