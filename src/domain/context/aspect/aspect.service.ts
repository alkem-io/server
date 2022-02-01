import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateAspectInput, Aspect, IAspect } from '@domain/context/aspect';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteAspectInput } from './dto/aspect.dto.delete';
import { UpdateAspectInput } from './dto/aspect.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { DiscussionService } from '@domain/communication/discussion/discussion.service';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';

@Injectable()
export class AspectService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private discussionService: DiscussionService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAspect(
    aspectInput: CreateAspectInput,
    userID: string
  ): Promise<IAspect> {
    const aspect: IAspect = Aspect.create(aspectInput);
    aspect.authorization = new AuthorizationPolicy();
    aspect.createdBy = userID;
    aspect.banner = await this.visualService.createVisualBanner();
    aspect.bannerNarrow = await this.visualService.createVisualBanner();

    aspect.discussion = await this.discussionService.createDiscussion(
      {
        communicationID: '',
        title: aspectInput.title,
        description: aspectInput.description,
        category: DiscussionCategory.GENERAL,
      },
      'communicationGroupID',
      userID,
      `aspect-discussion-${aspect.title}`
    );

    return await this.aspectRepository.save(aspect);
  }

  async removeAspect(deleteData: DeleteAspectInput): Promise<IAspect> {
    const aspectID = deleteData.ID;
    const aspect = await this.getAspectOrFail(aspectID);
    if (aspect.authorization)
      await this.authorizationPolicyService.delete(aspect.authorization);

    const result = await this.aspectRepository.remove(aspect as Aspect);
    result.id = aspectID;
    return result;
  }

  async getAspectOrFail(aspectID: string): Promise<IAspect> {
    const aspect = await this.aspectRepository.findOne({ id: aspectID });
    if (!aspect)
      throw new EntityNotFoundException(
        `Not able to locate aspect with the specified ID: ${aspectID}`,
        LogContext.CHALLENGES
      );
    return aspect;
  }

  async updateAspect(aspectData: UpdateAspectInput): Promise<IAspect> {
    const aspect = await this.getAspectOrFail(aspectData.ID);

    // Copy over the received data
    if (aspectData.title) {
      aspect.title = aspectData.title;
    }
    if (aspectData.description) {
      aspect.description = aspectData.description;
    }

    await this.aspectRepository.save(aspect);

    return aspect;
  }

  async saveAspect(aspect: IAspect): Promise<IAspect> {
    return await this.aspectRepository.save(aspect);
  }
}
