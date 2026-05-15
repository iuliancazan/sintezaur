import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  STORAGE_DEFAULT_CACHE_CONTROL,
  type StorageDriver,
  type StoragePutInput,
  type StoragePutResult,
} from '@sintezaur/shared';

/**
 * S3StorageDriver — talks to Cloudflare R2 (S3-compatible).
 *
 * Required env on prod: `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
 * `R2_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL`. The endpoint hosts
 * the API; the public URL is the custom domain (`files.sintezaur.ro`),
 * separate so we can change the CDN edge without re-deploying.
 *
 * R2 has no concept of regions — `us-east-1` is the canonical literal
 * the SDK requires, ignored server-side.
 */
@Injectable()
export class S3StorageDriver implements StorageDriver {
  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.required('R2_ENDPOINT');
    this.bucket = this.required('R2_BUCKET');
    const accessKeyId = this.required('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.required('R2_SECRET_ACCESS_KEY');
    this.publicBaseUrl = this.required('STORAGE_PUBLIC_BASE_URL').replace(
      /\/+$/,
      '',
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
  }

  async put(input: StoragePutInput): Promise<StoragePutResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl ?? STORAGE_DEFAULT_CACHE_CONTROL,
      }),
    );
    return { key: input.key, size: input.body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = res.Body;
    if (!body) {
      throw new Error(`S3 GET ${key} returned empty body`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw err;
    }
  }

  url(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  private required(name: string): string {
    const v = this.config.get<string>(name);
    if (!v) {
      throw new Error(
        `${name} env var is required when STORAGE_DRIVER=s3`,
      );
    }
    return v;
  }
}
