import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteAspectInput } from './dto/aspect.dto.delete';
import { UpdateAspectInput } from './dto/aspect.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { CreateAspectInput } from './dto/aspect.dto.create';
import { CardProfileService } from '../card-profile/card.profile.service';
import { ICardProfile } from '../card-profile';

@Injectable()
export class AspectService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private commentsService: CommentsService,
    private cardProfileService: CardProfileService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createAspect(
    aspectInput: CreateAspectInput,
    userID: string,
    communicationGroupID: string
  ): Promise<IAspect> {
    const aspect: IAspect = Aspect.create(aspectInput);
    aspect.profile = await this.cardProfileService.createCardProfile(
      aspectInput.profileData
    );
    aspect.authorization = new AuthorizationPolicy();
    aspect.createdBy = userID;
    aspect.banner = await this.visualService.createVisualBanner(
      aspectInput.visualUri
    );
    aspect.bannerNarrow = await this.visualService.createVisualBannerNarrow(
      aspectInput.visualUri
    );

    aspect.comments = await this.commentsService.createComments(
      communicationGroupID,
      `aspect-comments-${aspect.displayName}`
    );

    return await this.aspectRepository.save(aspect);
  }

  public async deleteAspect(deleteData: DeleteAspectInput): Promise<IAspect> {
    const aspectID = deleteData.ID;
    const aspect = await this.getAspectOrFail(aspectID, {
      relations: ['references', 'profile'],
    });
    if (aspect.authorization) {
      await this.authorizationPolicyService.delete(aspect.authorization);
    }
    if (aspect.banner) {
      await this.visualService.deleteVisual({ ID: aspect.banner.id });
    }
    if (aspect.bannerNarrow) {
      await this.visualService.deleteVisual({ ID: aspect.bannerNarrow.id });
    }
    if (aspect.profile) {
      await this.cardProfileService.deleteCardProfile(aspect.profile.id);
    }
    if (aspect.comments) {
      await this.commentsService.deleteComments(aspect.comments);
    }

    const result = await this.aspectRepository.remove(aspect as Aspect);
    result.id = aspectID;
    return result;
  }

  public async getAspectOrFail(
    aspectID: string,
    options?: FindOneOptions<Aspect>
  ): Promise<IAspect> {
    const aspect = await this.aspectRepository.findOne(
      { id: aspectID },
      options
    );
    if (!aspect)
      throw new EntityNotFoundException(
        `Not able to locate aspect with the specified ID: ${aspectID}`,
        LogContext.CHALLENGES
      );
    return aspect;
  }

  public async updateAspect(aspectData: UpdateAspectInput): Promise<IAspect> {
    const aspect = await this.getAspectOrFail(aspectData.ID, {
      relations: ['profile'],
    });

    // Copy over the received data
    if (aspectData.displayName) {
      aspect.displayName = aspectData.displayName;
    }
    if (aspectData.profileData) {
      if (!aspect.profile) {
        throw new EntityNotFoundException(
          `Aspect not initialised: ${aspect.id}`,
          LogContext.COLLABORATION
        );
      }
      aspect.profile = await this.cardProfileService.updateCardProfile(
        aspect.profile,
        aspectData.profileData
      );
    }
    if (aspectData.type) {
      aspect.type = aspectData.type;
    }

    await this.aspectRepository.save(aspect);

    return aspect;
  }

  public async saveAspect(aspect: IAspect): Promise<IAspect> {
    return await this.aspectRepository.save(aspect);
  }

  public async getCardProfile(aspect: IAspect): Promise<ICardProfile> {
    const aspectLoaded = await this.getAspectOrFail(aspect.id, {
      relations: ['profile'],
    });
    if (!aspectLoaded.profile)
      throw new EntityNotFoundException(
        `Card profile not initialised for aspect: ${aspect.id}`,
        LogContext.COLLABORATION
      );

    return aspectLoaded.profile;
  }

  public async getComments(aspectID: string) {
    const { commentsId } = await this.aspectRepository
      .createQueryBuilder('aspect')
      .select('aspect.commentsId', 'commentsId')
      .where({ id: aspectID })
      .getRawOne();

    if (!commentsId) {
      throw new EntityNotFoundException(
        `Comments not found on aspect: ${aspectID}`,
        LogContext.COLLABORATION
      );
    }

    return this.commentsService.getCommentsOrFail(commentsId);
  }

  public async getAspectsInCalloutCount(calloutId: string) {
    return this.aspectRepository.count({
      where: { callout: { id: calloutId } },
    });
  }
}
