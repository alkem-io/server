import * as process from 'process';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'util';
import { readFile, unlink, writeFile, existsSync, mkdirSync } from 'fs';
import { LocalStorageSaveFailedException } from '@common/exceptions/storage/local.storage.save.failed.exception';
import { ConfigurationTypes, LogContext } from '@common/enums';
import {
  LocalStorageDeleteFailedException,
  LocalStorageReadFailedException,
} from '@common/exceptions/storage';
import { StorageService } from '../storage.service.interface';
import { StorageServiceType } from '../storage.service.type';
import { calculateHash } from '@common/utils';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

@Injectable()
export class LocalStorageAdapter implements StorageService {
  private readonly storagePath: string;

  constructor(private configService: ConfigService) {
    this.storagePath = this.configService.get(
      ConfigurationTypes.STORAGE
    )?.local_storage?.path;
  }

  public getType(): StorageServiceType {
    return StorageServiceType.LOCAL_STORAGE;
  }
  // todo: leave it as only Buffer for now; it may need to expand the type
  // so it handles other types of data
  public save(data: Buffer) {
    return this.saveFromBuffer(data);
  }

  public async read(fileName: string): Promise<Buffer> | never {
    const filePath = this.getFilePath(fileName);
    try {
      return await readFileAsync(filePath);
    } catch (e: any) {
      throw new LocalStorageSaveFailedException(
        'Unable to read file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
          filePath,
          fileName,
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

    this.ensureStoragePathExists();

    try {
      await writeFileAsync(filePath, buffer);
      return fileName;
    } catch (e: any) {
      throw new LocalStorageReadFailedException(
        'Unable to read file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
          filePath,
          fileName,
        }
      );
    }
  }
  // todo: return the correct path; may not be in the correct folder
  private getFilePath(fileName: string): string {
    return path.join(this.getPath(), fileName);
  }

  private getPath() {
    return path.join(process.cwd(), this.storagePath);
  }

  private ensureStoragePathExists() {
    const dir = this.getPath();

    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  }

  private getFileName(data: Buffer): string {
    return calculateHash(data);
  }
}
