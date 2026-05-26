import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

const UPLOAD_EXPIRY_SECONDS = 900;  // 15 minutes
const DOWNLOAD_EXPIRY_SECONDS = 300; // 5 minutes
const SAFE_EXT_RE = /^[a-z0-9]{1,10}$/;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly internalOrigin: string;
  private readonly publicEndpoint: string | undefined;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(config.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL = config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    this.internalOrigin = `${protocol}://${endpoint}:${port}`;
    this.bucket = config.get<string>('MINIO_BUCKET', 'sdhp-files');
    this.publicEndpoint = config.get<string>('MINIO_PUBLIC_ENDPOINT') ?? undefined;

    this.client = new S3Client({
      endpoint: this.internalOrigin,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('MINIO_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('MINIO_SECRET_KEY', ''),
      },
      forcePathStyle: true,
    });
  }

  generateObjectKey(organizationId: string, patientId: string, fileName: string): string {
    const rawExt = path.extname(fileName).toLowerCase().slice(1);
    const ext = SAFE_EXT_RE.test(rawExt) ? `.${rawExt}` : '';
    return `${organizationId}/${patientId}/${randomUUID()}${ext}`;
  }

  async presignedPutUrl(objectKey: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: objectKey });
    const url = await getSignedUrl(this.client, command, { expiresIn: UPLOAD_EXPIRY_SECONDS });
    return this.rewriteUrl(url);
  }

  async presignedGetUrl(objectKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    const url = await getSignedUrl(this.client, command, { expiresIn: DOWNLOAD_EXPIRY_SECONDS });
    return this.rewriteUrl(url);
  }

  // Replaces the internal MinIO origin with the browser-reachable public endpoint.
  // Only the scheme+host+port prefix is swapped — the signed path and query string
  // are preserved verbatim so the SigV4 signature stays valid.
  // Nginx must forward requests to MinIO with Host: minio:9000 for the signature
  // to validate on the MinIO side.
  private rewriteUrl(signedUrl: string): string {
    if (!this.publicEndpoint) return signedUrl;
    const publicBase = this.publicEndpoint.replace(/\/$/, '');
    if (!signedUrl.startsWith(this.internalOrigin)) return signedUrl;
    return publicBase + signedUrl.slice(this.internalOrigin.length);
  }
}
