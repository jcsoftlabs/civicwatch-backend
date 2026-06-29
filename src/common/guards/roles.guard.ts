import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ORGANIZATION_SCOPE_KEY } from '../decorators/organization-scope.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { OrganizationRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const orgParam = this.reflector.getAllAndOverride<string | undefined>(
      ORGANIZATION_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const roles = this.reflector.getAllAndOverride<OrganizationRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!orgParam && !roles) {
      return true;
    }

    let organizationId: string | undefined;
    if (orgParam) {
      const rawOrganizationId = request.params?.[orgParam];
      organizationId = Array.isArray(rawOrganizationId)
        ? rawOrganizationId[0]
        : rawOrganizationId;
      if (!organizationId) {
        throw new ForbiddenException('organizationId manquant dans la requête.');
      }
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: user.userId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        organizationId: true,
        role: true,
      },
    });

    const hasGlobalSuperAdmin = memberships.some(
      (membership) => membership.role === OrganizationRole.SUPER_ADMIN,
    );

    if (organizationId && !hasGlobalSuperAdmin && memberships.length === 0) {
      throw new ForbiddenException(
        "Vous n'avez pas accès à cette organisation.",
      );
    }

    if (!roles || roles.length === 0) {
      return true;
    }

    if (hasGlobalSuperAdmin) {
      return true;
    }

    const allowed = memberships.some((membership) => roles.includes(membership.role));
    if (!allowed) {
      throw new ForbiddenException('Rôle insuffisant pour cette action.');
    }

    return true;
  }
}
