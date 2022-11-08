import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Aspect, IAspect } from '@domain/collaboration/aspect';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteAspectInput } from './dto/aspect.dto.delete';
import { UpdateAspectInput } from './dto/aspect.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { IReference } from '@domain/common/reference/reference.interface';
import { CreateReferenceOnAspectInput } from './dto/aspect.dto.create.reference';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { CreateAspectInput } from './dto/aspect.dto.create';

@Injectable()
export class AspectService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private commentsService: CommentsService,
    private referenceService: ReferenceService,
    private tagsetService: TagsetService,
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
    aspect.authorization = new AuthorizationPolicy();
    aspect.createdBy = userID;
    aspect.banner = await this.visualService.createVisualBanner(
      aspectInput.visualUri
    );
    aspect.bannerNarrow = await this.visualService.createVisualBannerNarrow(
      aspectInput.visualUri
    );
    aspect.references = [];

    aspect.comments = await this.commentsService.createComments(
      communicationGroupID,
      `aspect-comments-${aspect.displayName}`
    );

    aspect.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: aspectInput.tags || [],
    });

    return await this.aspectRepository.save(aspect);
  }

  public async deleteAspect(deleteData: DeleteAspectInput): Promise<IAspect> {
    const aspectID = deleteData.ID;
    const aspect = await this.getAspectOrFail(aspectID, {
      relations: ['references'],
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
    if (aspect.tagset) {
      await this.tagsetService.removeTagset({ ID: aspect.tagset.id });
    }
    if (aspect.comments) {
      await this.commentsService.deleteComments(aspect.comments);
    }
    if (aspect.references) {
      for (const reference of aspect.references) {
        await this.referenceService.deleteReference({ ID: reference.id });
      }
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
      relations: ['references'],
    });

    // Copy over the received data
    if (aspectData.displayName) {
      aspect.displayName = aspectData.displayName;
    }
    if (aspectData.description) {
      aspect.description = aspectData.description;
    }
    if (aspectData.type) {
      aspect.type = aspectData.type;
    }

    if (aspectData.tags) {
      if (!aspect.tagset) {
        throw new EntityNotInitializedException(
          `Aspect with id(${aspect.id}) not initialised with a tagset!`,
          LogContext.COMMUNITY
        );
      }
      aspect.tagset.tags = [...aspectData.tags];
    }

    if (aspectData.references) {
      aspect.references = await this.referenceService.updateReferences(
        aspect.references,
        aspectData.references
      );
    }

    await this.aspectRepository.save(aspect);

    return aspect;
  }

  public async saveAspect(aspect: IAspect): Promise<IAspect> {
    return await this.aspectRepository.save(aspect);
  }

  public async createReference(
    referenceInput: CreateReferenceOnAspectInput
  ): Promise<IReference> {
    const aspect = await this.getAspectOrFail(referenceInput.aspectID, {
      relations: ['references'],
    });

    if (!aspect.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COLLABORATION
      );
    // check there is not already a reference with the same name
    for (const reference of aspect.references) {
      if (reference.name === referenceInput.name) {
        throw new ValidationException(
          `Reference with the provided name already exists: ${referenceInput.name}`,
          LogContext.COLLABORATION
        );
      }
    }

    // If get here then no ref with the same name
    const newReference = await this.referenceService.createReference(
      referenceInput
    );
    await aspect.references.push(newReference);
    await this.aspectRepository.save(aspect);

    return newReference;
  }

  public async getReferences(aspect: IAspect): Promise<IReference[]> {
    const aspectLoaded = await this.getAspectOrFail(aspect.id, {
      relations: ['references'],
    });
    if (!aspectLoaded.references)
      throw new EntityNotFoundException(
        `Aspect not initialised: ${aspect.id}`,
        LogContext.COLLABORATION
      );

    return aspectLoaded.references;
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
