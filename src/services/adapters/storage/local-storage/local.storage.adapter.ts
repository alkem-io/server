import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'util';
import { readFile, unlink, writeFile, existsSync, mkdirSync } from 'fs';
import { LocalStorageSaveFailedException } from '@common/exceptions/storage/local-storage/local.storage.save.failed.exception';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { calculateBufferHash, pathResolve } from '@common/utils';
import {
  LocalStorageDeleteFailedException,
  LocalStorageReadFailedException,
} from '@common/exceptions/storage';
import { StorageService } from '../storage.service.interface';
import { StorageServiceType } from '../storage.service.type';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

@Injectable()
export class LocalStorageAdapter implements StorageService {
  private readonly storagePath: string;

  constructor(private configService: ConfigService) {
    const pathFromConfig = this.configService.get(ConfigurationTypes.STORAGE)
      ?.local_storage?.path;
    this.storagePath = pathResolve(pathFromConfig);
    this.ensureStoragePathExists();
  }

  public getType(): StorageServiceType {
    return StorageServiceType.LOCAL_STORAGE;
  }

  public save(data: Buffer) {
    return this.saveFromBuffer(data);
  }

  public async read(fileName: string): Promise<Buffer> | never {
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

  public async delete(fileName: string): Promise<void> | never {
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

  private async saveFromBuffer(buffer: Buffer): Promise<string> | never {
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
      mkdirSync(dir, { recursive: true });
    }
  }

  private getFileName(data: Buffer): string {
    return calculateBufferHash(data);
  }
}
