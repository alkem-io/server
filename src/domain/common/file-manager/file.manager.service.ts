import { Injectable } from '@nestjs/common';
import { ValidationException } from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { ReadStream } from 'fs';
import { streamToBuffer } from '@common/utils';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { IpfsDeleteFailedException } from '@common/exceptions/ipfs/ipfs.delete.exception';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs/ipfs.upload.exception';

@Injectable()
export class FileManagerService {
  constructor(
    private ipfsService: IpfsService,
    private configService: ConfigService
  ) {}

  public async uploadFile(
    readStream: ReadStream,
    fileName: string,
    mimetype: string
  ): Promise<string> {
    if (!(await this.validateMimeTypes(mimetype))) {
      throw new ValidationException(
        `Tried to import invalid mimetype ${mimetype}!`,
        LogContext.FILE_MANAGER
      );
    }

    const buffer = await streamToBuffer(readStream);

    try {
      return await this.ipfsService.uploadFileFromBuffer(buffer);
    } catch (error) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
  }

  public async removeFile(CID: string): Promise<boolean> {
    try {
      await this.ipfsService.unpinFile(CID);
      await this.ipfsService.garbageCollect();
    } catch (error) {
      throw new IpfsDeleteFailedException(
        `Ipfs removing file at path ${CID} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
    return true;
  }

  private validateMimeTypes(mimeType: string): boolean {
    const mimeTypes: string = this.configService.get(ConfigurationTypes.STORAGE)
      ?.file.mime_types;
    const allowedMimeTypes: string[] = mimeTypes.split(',');
    return allowedMimeTypes.includes(mimeType);
  }
}
