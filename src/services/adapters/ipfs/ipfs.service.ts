/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigurationTypes, LogContext } from '@common/enums';
import { streamToBuffer } from '@common/utils';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { ReadStream } from 'fs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
const { create } = require('ipfs-http-client');

@Injectable()
export class IpfsService {
  private ipfsEndpoint = '';
  private ipfsClientEndpoint = '';

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.ipfsEndpoint = this.configService.get(
      ConfigurationTypes.STORAGE
    )?.ipfs?.endpoint;
    this.ipfsClientEndpoint = this.configService.get(
      ConfigurationTypes.STORAGE
    )?.ipfs?.client_endpoint;
  }

  public async uploadFile(filePath: string): Promise<string> {
    this.logger.verbose?.(
      `Uploading file from path: ${filePath}`,
      LogContext.IPFS
    );
    const imageBuffer = fs.readFileSync(filePath);
    return this.uploadFileFromBuffer(imageBuffer);
  }

  public async uploadFileFromStream(stream: ReadStream): Promise<string> {
    const buffer = await streamToBuffer(stream);
    return await this.uploadFileFromBuffer(buffer);
  }

  public async uploadFileFromBuffer(buffer: Buffer): Promise<string> {
    const ipfsClient = create(new URL(this.ipfsEndpoint));

    const res = await ipfsClient.add(buffer, { pin: true });
    this.logger.verbose?.(
      `Uploaded filewith CID: ${res.path}`,
      LogContext.IPFS
    );
    return `${this.ipfsClientEndpoint}/${res.path}`;
  }

  public async removeFile(filePath: string): Promise<void> {
    this.logger.verbose?.(
      `Removing file from path: ${filePath}`,
      LogContext.IPFS
    );

    const ipfsClient = create(new URL(this.ipfsEndpoint));
    return ipfsClient.files.rm(filePath);
  }
}
