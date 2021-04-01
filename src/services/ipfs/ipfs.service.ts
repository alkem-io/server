import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class IpfsService {
  constructor(private configService: ConfigService) {}

  public async uploadFile(filePath: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IpfsHttpClient = require('ipfs-http-client');
    const ipfsClient = new IpfsHttpClient(
      new URL(this.configService.get('ipfs').endpoint)
    );
    const image = fs.readFileSync(filePath);
    const res = await ipfsClient.add(image, { pin: true });
    return `${this.configService.get('ipfs').clientEndpoint}/${res.cid.string}`;
  }
}
