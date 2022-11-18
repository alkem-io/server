import { Injectable } from '@nestjs/common';
import { ValidationException } from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { ReadStream } from 'fs';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs.upload.exception';
import { streamToBuffer } from '@common/utils';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { IpfsDeleteFailedException } from '@common/exceptions/ipfs.delete.exception';

@Injectable()
export class FileManagerService {
  constructor(
    private ipfsService: IpfsService,
    private configService: ConfigService
  ) {}

  async uploadFile(
    readStream: ReadStream,
    fileName: string,
    mimetype: string
  ): Promise<string> {
    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.FILE_MANAGER
      );

    if (!mimetype)
      throw new ValidationException(
        'Mimetype should be defined!',
        LogContext.FILE_MANAGER
      );

    if (!(await this.validateMimeTypes(mimetype))) {
      throw new ValidationException(
        `Tried to import invalid mimetype ${mimetype}!`,
        LogContext.FILE_MANAGER
      );
    }

    const buffer = await streamToBuffer(readStream);

    try {
      return await this.ipfsService.uploadFileFromBuffer(buffer);
    } catch (error: any) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${error.message}`
      );
    }
  }

  async removeFile(CID: string): Promise<boolean> {
    try {
      await this.ipfsService.unpinFile(CID);
      await this.ipfsService.garbageCollect();

      return true;
    } catch (error: any) {
      throw new IpfsDeleteFailedException(
        `Ipfs removing file at path ${CID} failed! Error: ${error.message}`
      );
    }
  }

  private async validateMimeTypes(mimeType: string): Promise<boolean> {
    const mimeTypes: string = this.configService.get(ConfigurationTypes.STORAGE)
      ?.ipfs.mime_types;
    const allowedMimeTypes: string[] = mimeTypes.split(',');
    if (!allowedMimeTypes.includes(mimeType)) return false;
    return true;
  }
}
