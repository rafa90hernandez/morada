import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const authenticatedUser = request.user;

    if (!authenticatedUser?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    const admin = await this.database.user.findFirst({
      where: {
        id: authenticatedUser.id,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Administrator access required.');
    }

    return true;
  }
}
