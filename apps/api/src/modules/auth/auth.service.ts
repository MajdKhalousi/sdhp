import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditLogsWriterService } from '../audit-logs/audit-logs-writer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone, deletedAt: null },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        branchId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
    };

    await this.auditWriter.log({ caller: payload, action: 'LOGIN', resource: 'auth', resourceId: user.id });

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        branchId: user.branchId,
      },
    };
  }

  logout(caller: JwtPayload): void {
    // Server-side token revocation is deferred — requires Redis denylist integration.
    // The client MUST discard the token immediately on receiving this response.
    // Current JWT lifetime is 24 h in production (see JWT_EXPIRES_IN in env).
    this.logger.log(`Logout — userId=${caller.sub}`);
    void this.auditWriter.log({ caller, action: 'LOGOUT', resource: 'auth', resourceId: caller.sub });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const sameAsCurrent = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const BCRYPT_ROUNDS = 12;
    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
      select: { id: true },
    });

    this.logger.log(`Password changed — userId=${userId}`);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
        branch: { select: { id: true, name: true } },
        doctor: { select: { id: true, specialization: true, departmentId: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
