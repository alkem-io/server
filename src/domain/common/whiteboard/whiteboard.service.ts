import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateWhiteboardContentInput } from './dto/whiteboard.dto.update.content';
import { ExcalidrawContent } from '@common/interfaces';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService
  ) {}

  async createWhiteboard(
    whiteboardRtData: CreateWhiteboardInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IWhiteboard> {
    const whiteboardRt: IWhiteboard = Whiteboard.create({
      ...whiteboardRtData,
    });
    whiteboardRt.authorization = new AuthorizationPolicy();
    whiteboardRt.createdBy = userID;
    whiteboardRt.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    whiteboardRt.profile = await this.profileService.createProfile(
      whiteboardRtData.profileData,
      ProfileType.WHITEBOARD_RT,
      storageAggregator
    );
    await this.profileService.addVisualOnProfile(
      whiteboardRt.profile,
      VisualType.CARD
    );
    await this.profileService.addTagsetOnProfile(whiteboardRt.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return this.save(whiteboardRt);
  }

  async getWhiteboardOrFail(
    whiteboardRtID: string,
    options?: FindOneOptions<Whiteboard>
  ): Promise<IWhiteboard | never> {
    const whiteboardRt = await this.whiteboardRepository.findOne({
      where: { id: whiteboardRtID },
      ...options,
    });

    if (!whiteboardRt)
      throw new EntityNotFoundException(
        `Not able to locate WhiteboardRt with the specified ID: ${whiteboardRtID}`,
        LogContext.CHALLENGES
      );
    return whiteboardRt;
  }

  async deleteWhiteboard(whiteboardRtID: string): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardRtID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (whiteboard.profile) {
      await this.profileService.deleteProfile(whiteboard.profile.id);
    }

    if (whiteboard.authorization) {
      await this.authorizationPolicyService.delete(whiteboard.authorization);
    }

    const deletedWhiteboardRt = await this.whiteboardRepository.remove(
      whiteboard as Whiteboard
    );
    deletedWhiteboardRt.id = whiteboardRtID;
    return deletedWhiteboardRt;
  }

  async updateWhiteboard(
    whiteboardInput: IWhiteboard,
    updateWhiteboardData: UpdateWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
      },
    });

    if (updateWhiteboardData.profileData) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profileData
      );
    }

    if (updateWhiteboardData.contentUpdatePolicy) {
      whiteboard.contentUpdatePolicy = updateWhiteboardData.contentUpdatePolicy;
    }

    return this.save(whiteboard);
  }

  async updateWhiteboardContent(
    whiteboardInput: IWhiteboard,
    updateWhiteboardContentData: UpdateWhiteboardContentInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
      },
    });

    if (
      !updateWhiteboardContentData.content ||
      updateWhiteboardContentData.content === whiteboard.content
    ) {
      return whiteboard;
    }

    if (!whiteboard?.profile) {
      throw new EntityNotInitializedException(
        `Profile not initialized on whiteboard: '${whiteboard.id}'`,
        LogContext.COLLABORATION
      );
    }

    const newContent = await this.reuploadDocumentsIfNotInBucket(
      JSON.parse(updateWhiteboardContentData.content),
      whiteboard?.profile.id
    );

    whiteboard.content = JSON.stringify(newContent);
    return this.save(whiteboard);
  }

  public async getProfile(
    whiteboardId: string,
    relations?: FindOptionsRelations<IWhiteboard>
  ): Promise<IProfile> {
    const whiteboardLoaded = await this.getWhiteboardOrFail(whiteboardId, {
      relations: {
        profile: true,
        ...relations,
      },
    });

    if (!whiteboardLoaded.profile)
      throw new EntityNotFoundException(
        `WhiteboardRt profile not initialised: ${whiteboardId}`,
        LogContext.COLLABORATION
      );

    return whiteboardLoaded.profile;
  }

  public save(whiteboard: IWhiteboard): Promise<IWhiteboard> {
    return this.whiteboardRepository.save(whiteboard);
  }

  private async reuploadDocumentsIfNotInBucket(
    whiteboardContent: ExcalidrawContent,
    profileIdToCheck: string
  ): Promise<ExcalidrawContent> | never {
    if (!whiteboardContent.files) {
      return whiteboardContent;
    }

    const files = Object.entries(whiteboardContent.files);

    if (!files.length) {
      return whiteboardContent;
    }

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }

      const newDocUrl =
        await this.profileDocumentsService.reuploadDocumentsToProfile(
          file.url,
          profileIdToCheck
        );

      if (!newDocUrl) {
        continue;
      }

      // change the url to the new document
      whiteboardContent.files[file.id] = {
        ...file,
        url: newDocUrl,
      };
    }

    return whiteboardContent;
  }
}
