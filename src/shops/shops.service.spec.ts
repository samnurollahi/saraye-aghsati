import { NotFoundException } from '@nestjs/common';
import QRCode from 'qrcode';
import { DataSource, Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopPaginationDto } from './dto/shop-pagination.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';
import { ShopsService } from './shops.service';

const now = new Date('2026-10-08T12:00:00.000Z');
const shopRecord = (overrides: Partial<Shop> = {}): Shop => ({
  id: '6b2d98f2-82e8-4ac5-8f32-646888a4f3bb',
  name: 'فروشگاه نمونه',
  ownerName: 'علی رضایی',
  phone: '09120000000',
  address: 'تهران',
  description: 'فروشگاه لوازم خانگی',
  qrCodeToken: 'secure-random-token',
  isActive: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  ...overrides,
});

describe('ShopsService', () => {
  let service: ShopsService;
  let repository: Record<string, jest.Mock>;
  let accountRepository: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => shopRecord(value)),
      findAndCount: jest.fn(async () => [[shopRecord()], 1]),
      findOne: jest.fn(async () => shopRecord()),
      findOneBy: jest.fn(async () => shopRecord()),
      softRemove: jest.fn(async () => undefined),
    };
    accountRepository = { findOneBy: jest.fn(async () => null) };
    service = new ShopsService(
      { transaction: jest.fn() } as unknown as DataSource,
      repository as unknown as Repository<Shop>,
      accountRepository as unknown as Repository<
        import('./entities/shop-account.entity').ShopAccount
      >,
    );
  });

  it('generates distinct secure tokens on shop creation without returning them', async () => {
    const dto: CreateShopDto = {
      name: 'فروشگاه نمونه',
      ownerName: 'علی رضایی',
      phone: '09120000000',
      address: 'تهران',
      description: 'فروشگاه لوازم خانگی',
    };
    const first = await service.create(dto);
    const firstToken = repository.create.mock.calls[0][0].qrCodeToken as string;
    await service.create(dto);
    const secondToken = repository.create.mock.calls[1][0]
      .qrCodeToken as string;

    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secondToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstToken).not.toBe(secondToken);
    expect(first).not.toHaveProperty('qrCodeToken');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('paginates shops and omits QR tokens from admin results', async () => {
    const pagination = Object.assign(new ShopPaginationDto(), {
      page: 2,
      limit: 5,
    });

    const result = await service.list(pagination);

    expect(repository.findAndCount).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
    expect(result).toMatchObject({ page: 2, limit: 5, total: 1 });
    expect(result.items[0]).not.toHaveProperty('qrCodeToken');
  });

  it('updates shop fields and supports deactivation', async () => {
    const dto: UpdateShopDto = { name: 'نام جدید', isActive: false };

    const result = await service.update(shopRecord().id, dto);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'نام جدید', isActive: false }),
    );
    expect(result.isActive).toBe(false);
  });

  it('soft deletes a shop', async () => {
    await service.remove(shopRecord().id);

    expect(repository.softRemove).toHaveBeenCalledWith(shopRecord());
  });

  it('generates a PNG data URL QR from the stored token', async () => {
    const result = await service.createQrCode(shopRecord().id);

    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: shopRecord().id },
      select: { id: true, qrCodeToken: true },
    });
    await expect(result).toBe(await QRCode.toDataURL('secure-random-token'));
  });

  it('returns only public fields for an active shop scan', async () => {
    const result = await service.scan('secure-random-token');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { qrCodeToken: 'secure-random-token', isActive: true },
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        address: true,
        description: true,
      },
    });
    expect(result).not.toHaveProperty('qrCodeToken');
    expect(result).not.toHaveProperty('isActive');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('rejects invalid tokens and inactive shops', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.scan('invalid-token')).rejects.toThrow(
      new NotFoundException('فروشگاه فعال یافت نشد.'),
    );
    await expect(service.scan('inactive-shop-token')).rejects.toThrow(
      new NotFoundException('فروشگاه فعال یافت نشد.'),
    );
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { qrCodeToken: 'invalid-token', isActive: true },
      }),
    );
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { qrCodeToken: 'inactive-shop-token', isActive: true },
      }),
    );
  });
});
