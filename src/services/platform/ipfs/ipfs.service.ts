/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigurationTypes } from '@common/enums';
import { streamToBuffer } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { ReadStream } from 'fs';
const { create } = require('ipfs-http-client');

@Injectable()
export class IpfsService {
  private ipfsEndpoint = '';
  private ipfsClientEndpoint = '';
  constructor(private configService: ConfigService) {
    this.ipfsEndpoint = this.configService.get(
      ConfigurationTypes.Storage
    )?.ipfs?.endpoint;
    this.ipfsClientEndpoint = this.configService.get(
      ConfigurationTypes.Storage
    )?.ipfs?.clientEndpoint;
  }

  public async uploadFile(filePath: string) {
    const ipfsClient = create(new URL(this.ipfsEndpoint));
    const image = fs.readFileSync(filePath);
    const res = await ipfsClient.add(image, { pin: true });
    return `${this.ipfsClientEndpoint}/${res.cid.string}`;
  }

  public async uploadFileFromStream(stream: ReadStream): Promise<string> {
    const buffer = await streamToBuffer(stream);
    return await this.uploadFileFromBuffer(buffer);
  }

  public async uploadFileFromBuffer(buffer: Buffer): Promise<string> {
    const ipfsClient = create(new URL(this.ipfsEndpoint));

    const res = await ipfsClient.add(buffer, { pin: true });
    return `${this.ipfsClientEndpoint}/${res.cid.string}`;
  }
}
