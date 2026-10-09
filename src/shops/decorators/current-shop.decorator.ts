import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedShop } from '../../auth/auth.types';

export const CurrentShop = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedShop =>
    context.switchToHttp().getRequest<{ shop: AuthenticatedShop }>().shop,
);
