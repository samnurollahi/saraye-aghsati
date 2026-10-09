import { UserRole } from '../users/user-role.enum';

export interface JwtPayload {
  sub: string;
  principalType?: 'user' | 'shop';
  role?: UserRole;
  tokenUse: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  principalType?: 'user';
  userId: string;
  role: UserRole;
}

export interface AuthenticatedShop {
  principalType: 'shop';
  shopId: string;
}
