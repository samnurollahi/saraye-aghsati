import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  create(data: {
    fullName: string;
    nationalCode: string;
    phone: string;
    email: string | null;
    password: string;
    role: UserRole;
  }): Promise<User> {
    return this.usersRepository.save(this.usersRepository.create(data));
  }

  findByNationalCode(nationalCode: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { nationalCode } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  findForLogin(identifier: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phone = :identifier OR user.nationalCode = :identifier', {
        identifier,
      })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByIdWithRefreshTokenHash(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.usersRepository.update(id, { refreshTokenHash: hash });
  }

  async rotateRefreshTokenHash(
    id: string,
    currentHash: string,
    nextHash: string,
  ): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ refreshTokenHash: nextHash })
      .where('"id" = :id AND "refreshTokenHash" = :currentHash', {
        id,
        currentHash,
      })
      .execute();
    return result.affected === 1;
  }
}
