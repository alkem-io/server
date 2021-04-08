/* eslint-disable @typescript-eslint/no-var-requires */
import { streamToBuffer } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { ReadStream } from 'fs';
const IpfsHttpClient = require('ipfs-http-client');

@Injectable()
export class IpfsService {
  constructor(private configService: ConfigService) {}

  public async uploadFile(filePath: string) {
    const ipfsClient = new IpfsHttpClient(
      new URL(this.configService.get('ipfs').endpoint)
    );
    const image = fs.readFileSync(filePath);
    const res = await ipfsClient.add(image, { pin: true });
    return `${this.configService.get('ipfs').clientEndpoint}/${res.cid.string}`;
  }

  public async uploadFileFromStream(stream: ReadStream): Promise<string> {
    const buffer = await streamToBuffer(stream);
    return await this.uploadFileFromBuffer(buffer);
  }

  public async uploadFileFromBuffer(buffer: Buffer): Promise<string> {
    const ipfsClient = new IpfsHttpClient(
      new URL(this.configService.get('ipfs').endpoint)
    );

    const res = await ipfsClient.add(buffer, { pin: true });
    return `${this.configService.get('ipfs').clientEndpoint}/${res.cid.string}`;
  }
}
