import { Mutation, Resolver } from '@nestjs/graphql';
import { IpfsService } from './ipfs.service';

@Resolver()
export class IpfsResolver {
  constructor(private ipfsService: IpfsService) {}

  @Mutation(() => String, {
    description: 'Uploads a file to IPFS endpoint',
  })
  async testUploadImage(): Promise<any> {
    return await this.ipfsService.testUploadImage();
  }
}
