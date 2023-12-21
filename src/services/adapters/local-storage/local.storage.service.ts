import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs';
import { LocalStorageSaveFailedException } from '@common/exceptions/storage/local.storage.save.failed.exception';
import { LogContext } from '@common/enums';
import { LocalStorageDeleteFailedException } from '@common/exceptions/storage';
const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

const STORAGE_PATH = '/storage'; // todo move to config

@Injectable()
export class LocalStorageService {
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

  private async saveFromBuffer(
    buffer: Buffer,
    name?: string
  ): Promise<string> | never {
    const fileName = name ?? randomUUID();

    try {
      await writeFileAsync(STORAGE_PATH, buffer);
      return fileName;
    } catch (e: any) {
      throw new LocalStorageSaveFailedException(
        'Unable to save file',
        LogContext.LOCAL_STORAGE,
        {
          message: e?.message,
        }
      );
    }
  }

  // todo: return the correct path; may not be in the correct folder
  private getFilePath(fileName: string): string {
    return `${STORAGE_PATH}/${fileName}`;
  }
}
