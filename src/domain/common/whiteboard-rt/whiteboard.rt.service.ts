import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
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

@Injectable()
export class WhiteboardRtService {
  constructor(
    @InjectRepository(WhiteboardRt)
    private whiteboardRtRepository: Repository<WhiteboardRt>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService
  ) {}

  async createWhiteboard(
    whiteboardData: CreateWhiteboardRtInput,
    userID?: string
  ): Promise<IWhiteboardRt> {
    const whiteboard: IWhiteboardRt = WhiteboardRt.create({
      ...whiteboardData,
    });
    whiteboard.authorization = new AuthorizationPolicy();
    whiteboard.createdBy = userID;

    whiteboard.profile = await this.profileService.createProfile(
      whiteboardData.profileData
    );
    await this.profileService.addVisualOnProfile(
      whiteboard.profile,
      VisualType.CARD
    );
    await this.profileService.addTagsetOnProfile(whiteboard.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return this.save(whiteboard);
  }

  async getWhiteboardOrFail(
    whiteboardID: string,
    options?: FindOneOptions<WhiteboardRt>
  ): Promise<IWhiteboardRt | never> {
    const whiteboard = await this.whiteboardRtRepository.findOne({
      where: { id: whiteboardID },
      ...options,
    });

    if (!whiteboard)
      throw new EntityNotFoundException(
        `Not able to locate Whiteboard with the specified ID: ${whiteboardID}`,
        LogContext.CHALLENGES
      );
    return whiteboard;
  }

  async deleteWhiteboard(whiteboardID: string): Promise<IWhiteboardRt> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardID, {
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

    const deletedWhiteboard = await this.whiteboardRtRepository.remove(
      whiteboard as WhiteboardRt
    );
    deletedWhiteboard.id = whiteboardID;
    return deletedWhiteboard;
  }

  async updateWhiteboard(
    whiteboardInput: IWhiteboardRt,
    updateWhiteboardData: UpdateWhiteboardRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
      },
    });

    if (
      updateWhiteboardData.value &&
      updateWhiteboardData.value !== whiteboard.value
    ) {
      whiteboard.value = updateWhiteboardData.value;
    }
    if (updateWhiteboardData.profileData) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profileData
      );
    }
    return this.save(whiteboard);
  }

  public async getProfile(
    whiteboard: IWhiteboardRt,
    relations?: FindOptionsRelations<IWhiteboardRt>
  ): Promise<IProfile> {
    const whiteboardLoaded = await this.getWhiteboardOrFail(whiteboard.id, {
      relations: {
        profile: true,
        ...relations,
      },
    });

    if (!whiteboardLoaded.profile)
      throw new EntityNotFoundException(
        `WhiteboardRt profile not initialised: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    return whiteboardLoaded.profile;
  }

  public save(whiteboard: IWhiteboardRt): Promise<IWhiteboardRt> {
    return this.whiteboardRtRepository.save(whiteboard);
  }
}
