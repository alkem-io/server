import { Injectable } from '@nestjs/common';

@Injectable()
export class IpfsService {
  public async addImage(fileName: string, content: any) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IpfsHttpClient = require('ipfs-http-client');
    const ipfsClient = new IpfsHttpClient(new URL('http://127.0.0.1:5001'));
    const res = await ipfsClient.add({ path: fileName, content: content });
    return res.cid.string;
  }

  // public async updateImage() {}

  // public async deleteImage() {}
}
