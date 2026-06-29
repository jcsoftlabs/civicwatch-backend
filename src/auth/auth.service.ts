import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OrganizationRole,
  OrganizationType,
  UserStatus,
} from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { comparePassword, hashPassword } from '../common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        passwordHash,
        status: UserStatus.ACTIVE,
        organizationMembers:
          dto.organizationName && dto.organizationSlug
            ? {
                create: {
                  role: OrganizationRole.ORG_ADMIN,
                  organization: {
                    create: {
                      name: dto.organizationName,
                      slug: dto.organizationSlug,
                      type: dto.organizationType ?? OrganizationType.OTHER,
                      country: dto.country ?? 'Unknown',
                    },
                  },
                },
              }
            : undefined,
      },
      include: {
        organizationMembers: {
          include: {
            organization: true,
          },
        },
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const isValidPassword = await comparePassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const fullUser = await this.usersService.findById(user.id);
    return this.buildAuthResponse(fullUser);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.buildAuthResponse(user, false);
  }

  private buildAuthResponse(
    user: Awaited<ReturnType<UsersService['findById']>>,
    includeToken = true,
  ) {
    const organizations = user.organizationMembers.map((member) => ({
      id: member.organization.id,
      name: member.organization.name,
      slug: member.organization.slug,
      role: member.role,
    }));

    return {
      ...(includeToken
        ? {
            accessToken: this.jwtService.sign({
              sub: user.id,
              email: user.email,
            }),
          }
        : {}),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        organizations,
      },
    };
  }
}
