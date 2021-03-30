import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { createWriteStream } from 'fs';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { IpfsService } from './ipfs.service';

@Resolver()
export class IpfsResolver {
  constructor(@Inject(IpfsService) private ipfsService: IpfsService) {}

  @Mutation(() => String)
  async uploadFile(
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename }: FileUpload
  ): Promise<string> {
    const filePath = `./uploads/${filename}`;

    const res = new Promise(async (resolve, reject) =>
      createReadStream()
        .pipe(createWriteStream(filePath))
        .on('finish', () => resolve(true))
        .on('error', () => reject(false))
    );

    if (await res) {
      return await this.ipfsService.uploadFile(filePath);
    }

    throw new Error('File could not be saved to local disc!');
  }
}
