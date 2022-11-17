import { Injectable, NotImplementedException } from '@nestjs/common';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ReadStream } from 'fs';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs.exception';
import { streamToBuffer } from '@common/utils';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';

@Injectable()
export class FileManagerService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private ipfsService: IpfsService
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

    if (await this.validateMimeTypes(mimetype)) {
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

  async removeFile(filePath: string): Promise<void> {
    try {
      return await this.ipfsService.removeFile(filePath);
    } catch (error: any) {
      throw new IpfsUploadFailedException(
        `Ipfs removing file at path ${filePath} failed! Error: ${error.message}`
      );
    }
  }

  private async validateMimeTypes(mimeType: string): Promise<boolean> {
    throw new NotImplementedException('Not implemented');
  }
}
