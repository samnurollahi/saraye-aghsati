import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import * as QRCode from 'qrcode';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopPaginationDto } from './dto/shop-pagination.dto';
import {
  PublicShopResponseDto,
  ShopResponseDto,
} from './dto/shop-response.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';
import { ShopAccount } from './entities/shop-account.entity';
import { normalizeIranianPhone } from './phone-normalizer';

@Injectable()
export class ShopsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Shop)
    private readonly shopsRepository: Repository<Shop>,
    @InjectRepository(ShopAccount)
    private readonly accountsRepository: Repository<ShopAccount>,
  ) {}

  async create(dto: CreateShopDto): Promise<ShopResponseDto> {
    const shop = this.shopsRepository.create({
      ...dto,
      description: dto.description ?? null,
      qrCodeToken: randomBytes(32).toString('base64url'),
      isActive: true,
    });
    return this.toShopResponse(await this.shopsRepository.save(shop));
  }

  async list(pagination: ShopPaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const [shops, total] = await this.shopsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: shops.map((shop) => this.toShopResponse(shop)),
      page,
      limit,
      total,
    };
  }

  async update(id: string, dto: UpdateShopDto): Promise<ShopResponseDto> {
    const shop = await this.findById(id);
    Object.assign(shop, dto);
    if (dto.phone) {
      const account = await this.accountsRepository.findOneBy({ shopId: id });
      if (account) {
        try {
          const updated = await this.dataSource.transaction(async (manager) => {
            await manager.getRepository(ShopAccount).update(account.id, {
              loginPhone: normalizeIranianPhone(dto.phone!),
            });
            return manager.getRepository(Shop).save(shop);
          });
          return this.toShopResponse(updated);
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              'شماره تماس فروشگاه قبلاً برای فروشگاه دیگری ثبت شده است.',
            );
          }
          throw error;
        }
      }
    }
    return this.toShopResponse(await this.shopsRepository.save(shop));
  }

  async remove(id: string): Promise<void> {
    const shop = await this.findById(id);
    await this.shopsRepository.softRemove(shop);
  }

  async createQrCode(id: string): Promise<string> {
    const shop = await this.shopsRepository.findOne({
      where: { id },
      select: { id: true, qrCodeToken: true },
    });
    if (!shop) {
      throw new NotFoundException('فروشگاه یافت نشد.');
    }
    return QRCode.toDataURL(shop.qrCodeToken);
  }

  async scan(token: string): Promise<PublicShopResponseDto> {
    const shop = await this.shopsRepository.findOne({
      where: { qrCodeToken: token, isActive: true },
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        address: true,
        description: true,
      },
    });
    if (!shop) {
      throw new NotFoundException('فروشگاه فعال یافت نشد.');
    }
    return {
      id: shop.id,
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      description: shop.description,
    };
  }

  private async findById(id: string): Promise<Shop> {
    const shop = await this.shopsRepository.findOneBy({ id });
    if (!shop) {
      throw new NotFoundException('فروشگاه یافت نشد.');
    }
    return shop;
  }

  private toShopResponse(shop: Shop): ShopResponseDto {
    return {
      id: shop.id,
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      description: shop.description,
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code === '23505'
  );
}
