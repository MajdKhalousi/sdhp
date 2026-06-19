import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { StorageService } from '../storage/storage.service';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { EmployeesService } from './employees.service';
import { UploadEmployeeDocumentUrlDto } from './dto/upload-employee-document-url.dto';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

const DOCUMENT_SELECT = {
  id: true,
  employeeProfileId: true,
  category: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  uploadedById: true,
  createdAt: true,
  deletedAt: true,
} as const;

const UPLOAD_URL_EXPIRES_IN = 900;
const DOWNLOAD_URL_EXPIRES_IN = 300;

@Injectable()
export class EmployeesDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private auditWriter: AuditLogsWriterService,
    private employeesService: EmployeesService,
  ) {}

  async getUploadUrl(employeeProfileId: string, dto: UploadEmployeeDocumentUrlDto, caller: JwtPayload) {
    const profile = await this.employeesService.findOne(employeeProfileId, caller);

    const storageKey = this.storage.generateObjectKey(profile.organizationId, employeeProfileId, dto.fileName);
    const uploadUrl = await this.storage.presignedPutUrl(storageKey);

    return {
      uploadUrl,
      storageKey,
      method: 'PUT' as const,
      expiresIn: UPLOAD_URL_EXPIRES_IN,
    };
  }

  async create(employeeProfileId: string, dto: CreateEmployeeDocumentDto, caller: JwtPayload) {
    const profile = await this.employeesService.findOne(employeeProfileId, caller);

    if (!dto.storageKey.startsWith(`${profile.organizationId}/${employeeProfileId}/`)) {
      throw new BadRequestException('Invalid storage key for this employee profile');
    }

    try {
      const result = await this.prisma.employeeDocument.create({
        data: {
          employeeProfileId,
          category: dto.category,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          storageKey: dto.storageKey,
          uploadedById: caller.sub,
        },
        select: DOCUMENT_SELECT,
      });

      await this.auditWriter.log({
        caller,
        action: 'EMPLOYEE_DOCUMENT_UPLOADED',
        resource: 'employee_document',
        resourceId: result.id,
        newData: toSnapshot({
          employeeProfileId,
          category: result.category,
          fileName: result.fileName,
          mimeType: result.mimeType,
        }),
      });

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A document with this storageKey already exists');
      }
      throw e;
    }
  }

  async findAll(employeeProfileId: string, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller);

    return this.prisma.employeeDocument.findMany({
      where: { employeeProfileId, deletedAt: null },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(employeeProfileId: string, documentId: string, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller);
    const doc = await this.fetchDocument(employeeProfileId, documentId);

    const downloadUrl = await this.storage.presignedGetUrl(doc.storageKey);

    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_DOCUMENT_DOWNLOADED',
      resource: 'employee_document',
      resourceId: doc.id,
      newData: toSnapshot({ employeeProfileId, fileName: doc.fileName, mimeType: doc.mimeType }),
    });

    return {
      downloadUrl,
      expiresIn: DOWNLOAD_URL_EXPIRES_IN,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
    };
  }

  async remove(employeeProfileId: string, documentId: string, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller);
    const doc = await this.fetchDocument(employeeProfileId, documentId);

    await this.prisma.employeeDocument.update({
      where: { id: doc.id },
      data: { deletedAt: new Date() },
    });

    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_DOCUMENT_DELETED',
      resource: 'employee_document',
      resourceId: doc.id,
    });
  }

  private async fetchDocument(employeeProfileId: string, documentId: string) {
    const doc = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeProfileId, deletedAt: null },
      select: DOCUMENT_SELECT,
    });
    if (!doc) throw new NotFoundException('Employee document not found');
    return doc;
  }
}
