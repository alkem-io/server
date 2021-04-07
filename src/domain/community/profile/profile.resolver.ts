import { Roles } from '@common/decorators/roles.decorator';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs.exception';
import { ReferenceInput } from '@domain/common/reference/reference.dto';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling, SelfManagement } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { IpfsService } from '@src/services/ipfs/ipfs.service';
import { createWriteStream, unlinkSync } from 'fs';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { v4 as uuidv4 } from 'uuid';
import { ProfileInput } from './profile.dto';
import { ProfileService } from './profile.service';
import { IProfile } from '@domain/community/profile/profile.interface';
import { Profile } from '@domain/community/profile';

@Resolver()
export class ProfileResolver {
  constructor(
    private profileService: ProfileService,
    private ipfsService: IpfsService
  ) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Tagset, {
    description:
      'Creates a new tagset with the specified name for the profile with given id',
  })
  @Profiling.api
  async createTagsetOnProfile(
    @Args('profileID') profileID: number,
    @Args('tagsetName') tagsetName: string
  ): Promise<ITagset> {
    const tagset = await this.profileService.createTagset(
      profileID,
      tagsetName
    );
    return tagset;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Reference, {
    description:
      'Creates a new reference with the specified name for the profile with given id',
  })
  @Profiling.api
  async createReferenceOnProfile(
    @Args('profileID') profileID: number,
    @Args('referenceInput') referenceInput: ReferenceInput
  ): Promise<IReference> {
    const reference = await this.profileService.createReference(
      profileID,
      referenceInput
    );
    return reference;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Updates the fields on the Profile, such as avatar location or description',
  })
  @Profiling.api
  async updateProfile(
    @Args('ID') profileID: number,
    @Args('profileData') profileData: ProfileInput
  ): Promise<boolean> {
    return await this.profileService.updateProfile(profileID, profileData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.CommunityAdmins)
  @SelfManagement()
  @Mutation(() => Profile)
  async uploadAvatar(
    @Args('profileID') profileID: number,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename }: FileUpload
  ): Promise<IProfile> {
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
      const profileData: ProfileInput = {
        avatar: uri,
      };
      await this.profileService.updateProfile(profileID, profileData);
      return await this.profileService.getProfileOrFail(profileID);
    }

    throw new IpfsUploadFailedException(`Ipfs upload of ${filename} failed!`);
  }
}
