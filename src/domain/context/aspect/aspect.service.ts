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
import { CreateAspectInput, Aspect, IAspect } from '@domain/context/aspect';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteAspectInput } from './dto/aspect.dto.delete';
import { UpdateAspectInput } from './dto/aspect.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { IReference } from '@domain/common/reference/reference.interface';
import { CreateReferenceOnAspectInput } from './dto/aspect.dto.create.reference';
import { CommentsService } from '@domain/communication/comments/comments.service';

@Injectable()
export class AspectService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private commentsService: CommentsService,
    private referenceService: ReferenceService,
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
    aspect.references = [];

    aspect.comments = await this.commentsService.createComments(
      '',
      `aspect-comments-${aspect.displayName}`
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

  async getAspectOrFail(
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

  async updateAspect(aspectData: UpdateAspectInput): Promise<IAspect> {
    const aspect = await this.getAspectOrFail(aspectData.ID);

    // Copy over the received data
    if (aspectData.displayName) {
      aspect.displayName = aspectData.displayName;
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

  async createReference(
    referenceInput: CreateReferenceOnAspectInput
  ): Promise<IReference> {
    const aspect = await this.getAspectOrFail(referenceInput.aspectID, {
      relations: ['references'],
    });

    if (!aspect.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.CONTEXT
      );
    // check there is not already a reference with the same name
    for (const reference of aspect.references) {
      if (reference.name === referenceInput.name) {
        throw new ValidationException(
          `Reference with the provided name already exists: ${referenceInput.name}`,
          LogContext.CONTEXT
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

  async getReferences(context: IAspect): Promise<IReference[]> {
    const aspectLoaded = await this.getAspectOrFail(context.id, {
      relations: ['references'],
    });
    if (!aspectLoaded.references)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return aspectLoaded.references;
  }
}
