import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UserMapper } from '../common/mappers/user.mapper';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

type RefreshTokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email already registered.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.database.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        profile: {
          create: {
            displayName: dto.displayName,
            phone: dto.phone,
            primaryLanguage: 'pt-BR',
          },
        },
        verification: {
          create: {},
        },
        trustScore: {
          create: {
            score: 0,
          },
        },
      },
      include: {
        profile: true,
        verification: true,
        trustScore: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: UserMapper.toPrivateResponse(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await Promise.all([
      this.storeRefreshTokenHash(user.id, tokens.refreshToken),
      this.database.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      user: UserMapper.toPrivateResponse(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    const tokenMatches = await argon2.verify(
      user.refreshTokenHash,
      dto.refreshToken,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.storeRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      return {
        loggedOut: true,
      };
    }

    const tokenMatches = await argon2.verify(
      user.refreshTokenHash,
      dto.refreshToken,
    );

    if (tokenMatches) {
      await this.database.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash: null,
        },
      });
    }

    return {
      loggedOut: true,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const payload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.database.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash,
      },
    });
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }
}
