import { UserRole } from '../users/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  tokenUse: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}
