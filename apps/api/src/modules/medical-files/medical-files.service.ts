import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalTimelineEventType, Prisma, UserRole } from '@prisma/client';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateMedicalFileDto } from './dto/create-medical-file.dto';
import { UpdateMedicalFileDto } from './dto/update-medical-file.dto';
import { MedicalFileQueryDto } from './dto/medical-file-query.dto';
import { UploadUrlRequestDto } from './dto/upload-url-request.dto';

// ── Select constants ───────────────────────────────────────────────────────

const UPLOADER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
} as const;

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  organizationId: true,
  isActive: true,
} as const;

const FILE_SELECT = {
  id: true,
  organizationId: true,
  patientId: true,
  encounterId: true,
  uploadedById: true,
  category: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  uploadedBy: { select: UPLOADER_SELECT },
} as const;

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class MedicalFilesService {
  constructor(
    private prisma: PrismaService,
    private timelineWriter: MedicalTimelineWriterService,
    private storage: StorageService,
  ) {}

  async create(dto: CreateMedicalFileDto, caller: JwtPayload) {
    const orgId = await this.resolveCreateOrgId(dto, caller);

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.organizationId !== orgId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }

    if (!dto.storageKey.startsWith(`${orgId}/${dto.patientId}/`)) {
      throw new BadRequestException('Invalid file storage key for patient');
    }

    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }

    try {
      const result = await this.prisma.medicalFile.create({
        data: {
          organizationId: orgId,
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          uploadedById: caller.sub,
          category: dto.category,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          storageKey: dto.storageKey,
          description: dto.description,
        },
        select: FILE_SELECT,
      });

      await this.timelineWriter.log({
        organizationId: result.organizationId,
        patientId: result.patientId,
        eventType: MedicalTimelineEventType.MEDICAL_FILE_UPLOADED,
        createdById: caller.sub,
        metadata: {
          medicalFileId: result.id,
          fileName: result.fileName,
          category: result.category,
          mimeType: result.mimeType,
          encounterId: result.encounterId ?? null,
        },
      });

      return result;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A file with this storageKey already exists');
      }
      throw err;
    }
  }

  async findAll(query: MedicalFileQueryDto, caller: JwtPayload) {
    const orgId = this.resolveReadOrgId(query, caller);

    return this.prisma.medicalFile.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.uploadedById ? { uploadedById: query.uploadedById } : {}),
        deletedAt: null,
        ...this.createdAtFilter(query.from, query.to),
      },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const file = await this.fetchFile(id);
    this.assertOrgAccess(file, caller);
    return file;
  }

  async update(id: string, dto: UpdateMedicalFileDto, caller: JwtPayload) {
    const file = await this.fetchFile(id);
    this.assertOrgAccess(file, caller);

    return this.prisma.medicalFile.update({
      where: { id },
      data: {
        ...(dto.fileName !== undefined ? { fileName: dto.fileName } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
      },
      select: FILE_SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const file = await this.fetchFile(id);
    this.assertOrgAccess(file, caller);

    if (caller.role === UserRole.DOCTOR && file.uploadedById !== caller.sub) {
      throw new ForbiddenException('Doctors can only delete their own uploaded files');
    }

    return this.prisma.medicalFile.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: FILE_SELECT,
    });
  }

  async getUploadUrl(dto: UploadUrlRequestDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const orgId = caller.role === UserRole.SUPER_ADMIN
      ? patient.organizationId
      : caller.organizationId;

    if (patient.organizationId !== orgId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }

    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }

    const storageKey = this.storage.generateObjectKey(orgId, dto.patientId, dto.fileName);
    const uploadUrl = await this.storage.presignedPutUrl(storageKey);

    return {
      uploadUrl,
      storageKey,
      method: 'PUT' as const,
      expiresIn: 900,
    };
  }

  async getDownloadUrl(id: string, caller: JwtPayload) {
    const file = await this.fetchFile(id);
    this.assertOrgAccess(file, caller);

    const downloadUrl = await this.storage.presignedGetUrl(file.storageKey);

    return {
      downloadUrl,
      expiresIn: 300,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  async findByPatient(patientId: string, query: MedicalFileQueryDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }

    return this.prisma.medicalFile.findMany({
      where: {
        patientId,
        deletedAt: null,
        ...(query.category ? { category: query.category } : {}),
        ...this.createdAtFilter(query.from, query.to),
      },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveCreateOrgId(dto: CreateMedicalFileDto, caller: JwtPayload): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (dto.organizationId) return dto.organizationId;
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!patient) throw new NotFoundException('Patient not found');
      return patient.organizationId;
    }
    if (dto.organizationId && dto.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot create file for another organization');
    }
    return caller.organizationId;
  }

  private resolveReadOrgId(query: MedicalFileQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) return query.organizationId;
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access files for another organization');
    }
    return caller.organizationId;
  }

  private async fetchFile(id: string) {
    const file = await this.prisma.medicalFile.findFirst({
      where: { id, deletedAt: null },
      select: FILE_SELECT,
    });
    if (!file) throw new NotFoundException('Medical file not found');
    return file;
  }

  private assertOrgAccess(file: { organizationId: string }, caller: JwtPayload): void {
    if (caller.role !== UserRole.SUPER_ADMIN && file.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access file from another organization');
    }
  }

  private async assertEncounterBelongsToOrgAndPatient(
    encounterId: string,
    orgId: string,
    patientId: string,
  ): Promise<void> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: orgId, patientId, deletedAt: null },
      select: { id: true },
    });
    if (!encounter) {
      throw new BadRequestException('Encounter does not belong to this organization and patient');
    }
  }

  private createdAtFilter(from?: string, to?: string) {
    if (!from && !to) return {};
    return {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }
}
