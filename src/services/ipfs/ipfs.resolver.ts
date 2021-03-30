import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLUpload } from 'apollo-server-express';
import { IpfsService } from './ipfs.service';

@Resolver()
export class IpfsResolver {
  constructor(@Inject(IpfsService) private ipfsService: IpfsService) {}

  @Mutation(() => String, {
    description: 'Uploads a file to IPFS endpoint',
  })
  async addFileToIpfs(
    @Args({ name: 'fileName', type: () => String }) fileName: string,
    @Args({ name: 'contents', type: () => GraphQLUpload }) contents: any
  ): Promise<string> {
    return await this.ipfsService.addImage(fileName, contents);
  }
}
