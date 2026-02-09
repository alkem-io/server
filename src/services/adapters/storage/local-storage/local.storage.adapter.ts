import { LogContext } from '@common/enums';
import {
  LocalStorageDeleteFailedException,
  LocalStorageReadFailedException,
} from '@common/exceptions/storage';
import { LocalStorageSaveFailedException } from '@common/exceptions/storage/local-storage/local.storage.save.failed.exception';
import { StorageDisabledException } from '@common/exceptions/storage/storage.disabled.exception';
import { calculateBufferHash, pathResolve } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { existsSync, mkdirSync, readFile, unlink, writeFile } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { StorageService } from '../storage.service.interface';
import { StorageServiceType } from '../storage.service.type';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

@Injectable()
export class LocalStorageAdapter implements StorageService {
  private readonly enabled: boolean;
  private readonly storagePath: string;

  constructor(private configService: ConfigService<AlkemioConfig, true>) {
    this.enabled = this.configService.get('storage.enabled', { infer: true });
    const pathFromConfig = this.configService.get(
      'storage.local_storage.path',
      { infer: true }
    );
    this.storagePath = pathResolve(pathFromConfig);
    this.ensureStoragePathExists();
  }

  public getType(): StorageServiceType {
    return StorageServiceType.LOCAL_STORAGE;
  }

  public save(data: Buffer) {
    if (!this.enabled) {
      throw new StorageDisabledException(
        'Storage is currently disabled',
        LogContext.LOCAL_STORAGE
      );
    }

    return this.saveFromBuffer(data);
  }

  public async read(fileName: string): Promise<Buffer> {
    if (!this.enabled) {
      throw new StorageDisabledException(
        'Storage is currently disabled',
        LogContext.LOCAL_STORAGE
      );
    }

    const filePath = this.getFilePath(fileName);
    try {
      return await readFileAsync(filePath);
    } catch (e: any) {
      throw new LocalStorageReadFailedException(
        'Unable to read file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
          filePath,
          fileName,
          originalError: e,
        }
      );
    }
  }

  public async delete(fileName: string): Promise<void> {
    if (!this.enabled) {
      throw new StorageDisabledException(
        'Storage is currently disabled',
        LogContext.LOCAL_STORAGE
      );
    }

    const filePath = this.getFilePath(fileName);

    try {
      return await unlinkAsync(filePath);
    } catch (e: any) {
      throw new LocalStorageDeleteFailedException(
        'Unable to delete file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
          filePath,
          fileName,
          originalError: e,
        }
      );
    }
  }

  public exists(fileName: string): boolean {
    if (!this.enabled) {
      throw new StorageDisabledException(
        'Storage is currently disabled',
        LogContext.LOCAL_STORAGE
      );
    }

    const filePath = this.getFilePath(fileName);
    return existsSync(filePath);
  }

  private async saveFromBuffer(buffer: Buffer): Promise<string> {
    const fileName = this.getFileName(buffer);
    const filePath = this.getFilePath(fileName);

    if (existsSync(filePath)) {
      return fileName;
    }

    try {
      await writeFileAsync(filePath, buffer);
      return fileName;
    } catch (e: any) {
      throw new LocalStorageSaveFailedException(
        'Unable to save file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
          filePath,
          fileName,
          originalError: e,
        }
      );
    }
  }

  private getFilePath(fileName: string): string {
    return path.join(this.storagePath, fileName);
  }

  private ensureStoragePathExists() {
    const dir = this.storagePath;

    if (!existsSync(dir)) {
      const mode = process.env.NODE_ENV === 'production' ? 0o755 : 0o777;
      mkdirSync(dir, { recursive: true, mode });
    }
  }

  private getFileName(data: Buffer): string {
    return calculateBufferHash(data);
  }
}
