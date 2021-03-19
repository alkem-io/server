import { Injectable } from '@nestjs/common';
import ipfs from 'ipfs-http-client';
import fs from 'fs';

@Injectable()
export class IpfsService {
  // public async upload(file: string[]): Promise<string> {
  //   const ipfsClient = ipfs();
  //   return await ipfsClient.add({ p });
  // }

  public async testUploadImage() {
    const ipfsClient = ipfs();
    const image = fs.readFileSync('image.png');
    return await ipfsClient.add(image, { pin: true });
  }
}
