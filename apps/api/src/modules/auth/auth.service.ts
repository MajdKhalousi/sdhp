import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
