import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { WhiteboardRt } from './whiteboard.rt.entity';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { CreateWhiteboardRtInput } from './dto/whiteboard.rt.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { UpdateWhiteboardRtInput } from './dto/whiteboard.rt.dto.update';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { IProfile } from '../profile/profile.interface';
import { ProfileService } from '../profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@Injectable()
export class WhiteboardRtService {
  constructor(
    @InjectRepository(WhiteboardRt)
    private whiteboardRtRepository: Repository<WhiteboardRt>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService
  ) {}

  async createWhiteboardRt(
    whiteboardRtData: CreateWhiteboardRtInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IWhiteboardRt> {
    const whiteboardRt: IWhiteboardRt = WhiteboardRt.create({
      ...whiteboardRtData,
    });
    whiteboardRt.authorization = new AuthorizationPolicy();
    whiteboardRt.createdBy = userID;
    whiteboardRt.contentUpdatePolicy = ContentUpdatePolicy.OWNER_CONTRIBUTORS;

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

  async getWhiteboardRtOrFail(
    whiteboardRtID: string,
    options?: FindOneOptions<WhiteboardRt>
  ): Promise<IWhiteboardRt | never> {
    const whiteboardRt = await this.whiteboardRtRepository.findOne({
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

  async deleteWhiteboardRt(whiteboardRtID: string): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.getWhiteboardRtOrFail(whiteboardRtID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (whiteboardRt.profile) {
      await this.profileService.deleteProfile(whiteboardRt.profile.id);
    }

    if (whiteboardRt.authorization) {
      await this.authorizationPolicyService.delete(whiteboardRt.authorization);
    }

    const deletedWhiteboardRt = await this.whiteboardRtRepository.remove(
      whiteboardRt as WhiteboardRt
    );
    deletedWhiteboardRt.id = whiteboardRtID;
    return deletedWhiteboardRt;
  }

  async updateWhiteboardRt(
    whiteboardRtInput: IWhiteboardRt,
    updateWhiteboardRtData: UpdateWhiteboardRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.getWhiteboardRtOrFail(
      whiteboardRtInput.id,
      {
        relations: {
          profile: true,
        },
      }
    );

    if (
      updateWhiteboardRtData.content &&
      updateWhiteboardRtData.content !== whiteboardRt.content
    ) {
      whiteboardRt.content = updateWhiteboardRtData.content;
    }
    if (updateWhiteboardRtData.profileData) {
      whiteboardRt.profile = await this.profileService.updateProfile(
        whiteboardRt.profile,
        updateWhiteboardRtData.profileData
      );
    }
    return this.save(whiteboardRt);
  }

  public async getProfile(
    whiteboardRt: IWhiteboardRt,
    relations?: FindOptionsRelations<IWhiteboardRt>
  ): Promise<IProfile> {
    const whiteboardRtLoaded = await this.getWhiteboardRtOrFail(
      whiteboardRt.id,
      {
        relations: {
          profile: true,
          ...relations,
        },
      }
    );

    if (!whiteboardRtLoaded.profile)
      throw new EntityNotFoundException(
        `WhiteboardRt profile not initialised: ${whiteboardRt.id}`,
        LogContext.COLLABORATION
      );

    return whiteboardRtLoaded.profile;
  }

  public save(whiteboardRt: IWhiteboardRt): Promise<IWhiteboardRt> {
    return this.whiteboardRtRepository.save(whiteboardRt);
  }
}
