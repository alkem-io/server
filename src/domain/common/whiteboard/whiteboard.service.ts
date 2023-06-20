import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { WhiteboardCheckoutService } from '../whiteboard-checkout/whiteboard.checkout.service';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { IWhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.interface';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { AgentInfo } from '@core/authentication';
import { IProfile } from '../profile/profile.interface';
import { ProfileService } from '../profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { IVisual } from '../visual';
import { RestrictedTagsetNames } from '../tagset/tagset.entity';

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private whiteboardCheckoutService: WhiteboardCheckoutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService
  ) {}

  async createWhiteboard(
    whiteboardData: CreateWhiteboardInput,
    userID?: string
  ): Promise<IWhiteboard> {
    const whiteboard: IWhiteboard = Whiteboard.create({ ...whiteboardData });
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
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    // get the id assigned
    const savedWhiteboard = await this.save(whiteboard);

    whiteboard.checkout =
      await this.whiteboardCheckoutService.createWhiteboardCheckout({
        whiteboardID: savedWhiteboard.id,
      });

    return await this.save(whiteboard);
  }

  async getWhiteboardOrFail(
    whiteboardID: string,
    options?: FindOneOptions<Whiteboard>
  ): Promise<IWhiteboard | never> {
    const whiteboard = await this.whiteboardRepository.findOne({
      where: {
        id: whiteboardID,
      },
      ...options,
    });

    if (!whiteboard)
      throw new EntityNotFoundException(
        `Not able to locate Whiteboard with the specified ID: ${whiteboardID}`,
        LogContext.CHALLENGES
      );
    return whiteboard;
  }

  async deleteWhiteboard(whiteboardID: string): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardID, {
      relations: ['checkout', 'profile'],
    });

    if (whiteboard.checkout) {
      await this.whiteboardCheckoutService.delete(whiteboard.checkout.id);
    }

    if (whiteboard.profile) {
      await this.profileService.deleteProfile(whiteboard.profile.id);
    }

    if (whiteboard.authorization) {
      await this.authorizationPolicyService.delete(whiteboard.authorization);
    }

    const deletedWhiteboard = await this.whiteboardRepository.remove(
      whiteboard as Whiteboard
    );
    deletedWhiteboard.id = whiteboardID;
    return deletedWhiteboard;
  }

  async updateWhiteboard(
    whiteboardInput: IWhiteboard,
    updateWhiteboardData: UpdateWhiteboardInput,
    agentInfo: AgentInfo
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: ['checkout', 'profile'],
    });
    if (!whiteboard.checkout) {
      throw new EntityNotFoundException(
        `Whiteboard not initialised: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );
    }

    // Before updating the whiteboard contents check the user doing it has it checked out
    if (
      updateWhiteboardData.value &&
      updateWhiteboardData.value !== whiteboard.value
    ) {
      await this.whiteboardCheckoutService.isUpdateAllowedOrFail(
        whiteboard.checkout,
        agentInfo
      );
    }
    if (updateWhiteboardData.value)
      whiteboard.value = updateWhiteboardData.value;
    if (updateWhiteboardData.profileData) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profileData
      );
    }
    return await this.save(whiteboard);
  }

  async save(whiteboard: IWhiteboard): Promise<IWhiteboard> {
    return await this.whiteboardRepository.save(whiteboard);
  }

  public async getProfile(
    whiteboard: IWhiteboard,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const whiteboardLoaded = await this.getWhiteboardOrFail(whiteboard.id, {
      relations: ['profile', ...relations],
    });
    if (!whiteboardLoaded.profile)
      throw new EntityNotFoundException(
        `Whiteboard profile not initialised: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    return whiteboardLoaded.profile;
  }

  public async getVisualPreview(whiteboard: IWhiteboard): Promise<IVisual> {
    const profile = await this.getProfile(whiteboard);
    const preview = await this.profileService.getVisual(
      profile,
      VisualType.CARD
    );
    if (!preview)
      throw new EntityNotFoundException(
        `Whiteboard preview visual not initialised: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    return preview;
  }

  async getWhiteboardCheckout(
    whiteboard: IWhiteboard
  ): Promise<IWhiteboardCheckout> {
    const whiteboardWithCheckout = await this.getWhiteboardOrFail(
      whiteboard.id,
      {
        relations: ['checkout'],
      }
    );

    // Note: this is done the same as with organizationVerification, i.e. that
    // we create the entity wrapping a lifecycle if it is not present.
    // This is due to lifecycles being difficult to deal with via migraitons.
    // Needs further discussion.
    if (!whiteboardWithCheckout.checkout) {
      // create and add the checkout
      whiteboard.checkout =
        await this.whiteboardCheckoutService.createWhiteboardCheckout({
          whiteboardID: whiteboard.id,
        });

      await this.save(whiteboard);
    }

    if (!whiteboardWithCheckout.checkout)
      throw new EntityNotFoundException(
        `Whiteboard not initialised, no checkout: ${whiteboard.id}`,
        LogContext.CONTEXT
      );

    return whiteboardWithCheckout.checkout;
  }

  async getWhiteboardesInCalloutCount(calloutId: string): Promise<number> {
    return await this.whiteboardRepository.countBy({
      callout: { id: calloutId },
    });
  }
}
