import { IpfsUploadFailedException } from '@common/exceptions/ipfs.exception';
import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { createWriteStream, unlinkSync } from 'fs';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { IpfsService } from './ipfs.service';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from '@common/decorators';
import { AuthenticationException } from '@common/exceptions';
import { UserNotRegisteredException } from '@common/exceptions/registration.exception';
import { UserInfo } from '@src/core/authentication/user-info';

@Resolver()
export class IpfsResolver {
  constructor(@Inject(IpfsService) private ipfsService: IpfsService) {}

  @Mutation(() => String)
  async uploadFile(
    @CurrentUser() userInfo: UserInfo,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename }: FileUpload
  ): Promise<string> {
    if (!userInfo) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user.'
      );
    }
    if (!userInfo.user) {
      throw new UserNotRegisteredException();
    }

    const guid = uuidv4();
    const filePath = `./uploads/${filename}-${guid}`;

    const res = new Promise(async (resolve, reject) =>
      createReadStream()
        .pipe(createWriteStream(filePath))
        .on('finish', () => resolve(true))
        .on('error', () => reject(false))
    );

    if (await res) {
      const uri = await this.ipfsService.uploadFile(filePath);
      unlinkSync(filePath);

      return uri;
    }

    throw new IpfsUploadFailedException(`Ipfs upload of ${filename} failed!`);
  }
}
