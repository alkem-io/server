import { Injectable } from '@nestjs/common';
import fs from 'fs';

@Injectable()
export class IpfsService {
  // public async upload(file: string[]): Promise<string> {
  //   const ipfsClient = ipfs();
  //   return await ipfsClient.add({ p });
  // }

  public async testUploadImage() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IpfsHttpClient = require('ipfs-http-client');
    const ipfsClient = IpfsHttpClient();
    const image = fs.readFileSync('image.png');
    return await ipfsClient.add(image, { pin: true });
  }
}
