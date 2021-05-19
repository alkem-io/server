import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateReferenceInput, IReference } from '@domain/common/reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import {
  CreateContextInput,
  UpdateContextInput,
  IContext,
  Context,
} from '@domain/context/context';
import { CreateAspectInput, IAspect } from '@domain/context/aspect';
import { AspectService } from '../aspect/aspect.service';
import { EcosystemModel, IEcosystemModel } from '../ecosystem-model';

@Injectable()
export class ContextService {
  constructor(
    private aspectService: AspectService,
    private referenceService: ReferenceService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async createContext(contextData: CreateContextInput): Promise<IContext> {
    const context: IContext = Context.create(contextData);
    context.ecosystemModel = new EcosystemModel();
    context.references = [];
    return context;
  }

  async getContextOrFail(
    contextID: number,
    options?: FindOneOptions<Context>
  ): Promise<IContext> {
    const context = await this.contextRepository.findOne(
      { id: contextID },
      options
    );
    if (!context)
      throw new EntityNotFoundException(
        `No Context found with the given id: ${contextID}`,
        LogContext.CONTEXT
      );
    return context;
  }

  async updateContext(
    context: IContext,
    contextInput: UpdateContextInput
  ): Promise<IContext> {
    // Convert the data to json
    if (contextInput.tagline) {
      context.tagline = contextInput.tagline;
    }
    if (contextInput.background) {
      context.background = contextInput.background;
    }
    if (contextInput.vision) {
      context.vision = contextInput.vision;
    }
    if (contextInput.impact) {
      context.impact = contextInput.impact;
    }
    if (contextInput.who) {
      context.who = contextInput.who;
    }

    if (contextInput.references) {
      context.references = await this.referenceService.updateReferences(
        context.references,
        contextInput.references
      );
    }

    return await this.contextRepository.save(context);
  }

  async removeContext(contextID: number): Promise<IContext> {
    // Note need to load it in with all contained entities so can remove fully
    const context = await this.getContextOrFail(contextID, {
      relations: ['aspects'],
    });

    // Remove all references
    if (context.references) {
      for (const reference of context.references) {
        await this.referenceService.deleteReference({
          ID: reference.id.toString(),
        });
      }
    }

    // First remove all groups
    if (context.aspects) {
      for (const aspect of context.aspects) {
        await this.aspectService.removeAspect({ ID: aspect.id.toString() });
      }
    }

    return await this.contextRepository.remove(context as Context);
  }

  async createReference(
    referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const contextID = referenceInput.parentID;
    if (!contextID)
      throw new ValidationException(
        'No parendId specified for reference creation',
        LogContext.CHALLENGES
      );
    const context = await this.getContextOrFail(contextID);

    if (!context.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.CONTEXT
      );
    // check there is not already a reference with the same name
    for (const reference of context.references) {
      if (reference.name === referenceInput.name) {
        return reference;
      }
    }

    // If get here then no ref with the same name
    const newReference = await this.referenceService.createReference(
      referenceInput
    );
    await context.references.push(newReference);
    await this.contextRepository.save(context);

    return newReference;
  }

  async createAspect(aspectData: CreateAspectInput): Promise<IAspect> {
    const contextID = aspectData.parentID;
    const context = await this.getContextOrFail(contextID, {
      relations: ['aspects'],
    });
    if (!context.aspects)
      throw new EntityNotInitializedException(
        `Context (${contextID}) not initialised`,
        LogContext.CONTEXT
      );

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = context.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided title: ${title}`,
        LogContext.CONTEXT
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    context.aspects.push(aspect);
    await this.contextRepository.save(context);
    return aspect;
  }

  async getAspects(context: Context): Promise<IAspect[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['aspects'],
    });
    if (!contextLoaded.aspects)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.aspects;
  }

  async getEcosystemModel(context: Context): Promise<IEcosystemModel> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['ecosystemModel'],
    });
    if (!contextLoaded.ecosystemModel)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.ecosystemModel;
  }
}
