import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { CreateReferenceInput } from '@domain/common/reference';
import {
  UpdateProfileInput,
  Profile,
  IProfile,
} from '@domain/community/profile';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CreateProfileInput } from './profile.dto.create';

import { ReadStream } from 'fs';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs.exception';
import { streamToBuffer, validateImageDimensions } from '@common/utils';
import { IpfsService } from '@src/services/ipfs/ipfs.service';
import { UploadProfileAvatarInput } from './profile.dto.upload.avatar';

@Injectable()
export class ProfileService {
  constructor(
    private tagsetService: TagsetService,
    private referenceService: ReferenceService,
    private ipfsService: IpfsService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  private readonly minImageSize = 190;
  private readonly maxImageSize = 410;

  async createProfile(profileData?: CreateProfileInput): Promise<IProfile> {
    let data = profileData;
    if (!data) data = {};
    const profile: IProfile = Profile.create(data);
    if (!profile.references) {
      profile.references = [];
    }

    if (!profile.tagsets) {
      profile.tagsets = [];
    }

    if (profile.restrictedTagsetNames) {
      await this.tagsetService.createRestrictedTagsets(
        profile,
        profile.restrictedTagsetNames
      );
    }

    await this.profileRepository.save(profile);
    this.logger.verbose?.(
      `Created new profile with id: ${profile.id}`,
      LogContext.COMMUNITY
    );
    return profile;
  }

  async updateProfile(profileData: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileOrFail(profileData.ID);

    if (profileData.avatar) {
      profile.avatar = profileData.avatar;
    }
    if (profileData.description) {
      profile.description = profileData.description;
    }

    if (profileData.references) {
      profile.references = this.referenceService.updateReferences(
        profile.references,
        profileData.references
      );
    }

    if (profileData.tagsets) {
      profile.tagsets = this.tagsetService.updateTagsets(
        profile.tagsets,
        profileData.tagsets
      );
    }

    return await this.profileRepository.save(profile);
  }

  async deleteProfile(profileID: string): Promise<IProfile> {
    // Note need to load it in with all contained entities so can remove fully
    const profile = await this.getProfileOrFail(profileID);

    if (profile.tagsets) {
      for (const tagset of profile.tagsets) {
        await this.tagsetService.removeTagset({ ID: tagset.id.toString() });
      }
    }

    if (profile.references) {
      for (const reference of profile.references) {
        await this.referenceService.deleteReference({
          ID: reference.id.toString(),
        });
      }
    }

    return await this.profileRepository.remove(profile as Profile);
  }

  async createTagset(tagsetData: CreateTagsetInput): Promise<ITagset> {
    const profileID = tagsetData.parentID;
    if (!profileID)
      throw new ValidationException(
        'No parendId specified for tagset creation',
        LogContext.COMMUNITY
      );
    const profile = await this.getProfileOrFail(profileID);

    const tagset = await this.tagsetService.addTagsetWithName(
      profile,
      tagsetData
    );
    await this.profileRepository.save(profile);

    return tagset;
  }

  async createReference(
    referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const profileID = referenceInput.parentID;
    if (!profileID)
      throw new ValidationException(
        'No parendId specified for reference creation',
        LogContext.COMMUNITY
      );
    const profile = await this.getProfileOrFail(profileID);

    if (!profile.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COMMUNITY
      );
    // check there is not already a reference with the same name
    for (const reference of profile.references) {
      if (reference.name === referenceInput.name) {
        return reference;
      }
    }
    // If get here then no ref with the same name
    const newReference = await this.referenceService.createReference(
      referenceInput
    );

    await profile.references.push(newReference as Reference);
    await this.profileRepository.save(profile);

    return newReference;
  }

  async getProfileOrFail(profileID: string): Promise<IProfile> {
    const profile = await Profile.findOne({ id: profileID });
    if (!profile)
      throw new EntityNotFoundException(
        `Profile with id(${profileID}) not found!`,
        LogContext.COMMUNITY
      );
    return profile;
  }

  async uploadAvatar(
    readStream: ReadStream,
    fileName: string,
    mimetype: string,
    uploadData: UploadProfileAvatarInput
  ): Promise<IProfile> {
    const profileID = uploadData.profileID;
    if (
      !(
        mimetype === 'image/png' ||
        mimetype === 'image/jpeg' ||
        mimetype === 'image/jpg' ||
        mimetype === 'image/svg+xml' ||
        fileName === 'hello-cherrytwist.txt'
      )
    ) {
      throw new ValidationException(
        `Forbidden avatar upload file type ${mimetype}. File must be jpg / jpeg / png / svg.`,
        LogContext.COMMUNITY
      );
    }

    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.COMMUNITY
      );

    const buffer = await streamToBuffer(readStream);

    if (
      !(await validateImageDimensions(
        buffer,
        this.minImageSize,
        this.maxImageSize
      ))
    )
      throw new ValidationException(
        `Upload file dimensions must be between ${this.minImageSize} and ${this.maxImageSize} pixels!`,
        LogContext.COMMUNITY
      );

    try {
      const uri = await this.ipfsService.uploadFileFromBuffer(buffer);
      const profileData: UpdateProfileInput = {
        ID: profileID.toString(),
        avatar: uri,
      };
      await this.updateProfile(profileData);
      return await this.getProfileOrFail(profileID.toString());
    } catch (error) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${error.message}`
      );
    }
  }
}
