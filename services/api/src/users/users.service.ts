import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  findByEmail(email: string) {
    return this.database.user.findUnique({
      where: { email },
      include: {
        profile: true,
        verification: true,
        trustScore: true,
      },
    });
  }

  findById(id: string) {
    return this.database.user.findUnique({
      where: { id },
      include: {
        profile: true,
        verification: true,
        trustScore: true,
      },
    });
  }
}
