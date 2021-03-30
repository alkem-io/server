import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class IpfsService {
  public async uploadFile(filePath: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IpfsHttpClient = require('ipfs-http-client');
    const ipfsClient = IpfsHttpClient();
    //const ipfsClient = new IpfsHttpClient(new URL('http://127.0.0.1:5001'));
    const image = fs.readFileSync(filePath);
    const res = await ipfsClient.add(image, { pin: true });
    return res.cid.string;
  }

  // public async updateFile() {}

  // public async deleteFile() {}
}
