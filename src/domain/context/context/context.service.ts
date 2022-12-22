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
import { IContext, Context, CreateContextInput } from '@domain/context/context';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EcosystemModelService } from '@domain/context/ecosystem-model/ecosystem-model.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateReferenceOnContextInput } from './dto/context.dto.create.reference';
import { UpdateContextInput } from './dto/context.dto.update';
import { VisualService } from '@domain/common/visual/visual.service';
import { IVisual } from '@domain/common/visual/visual.interface';
import { ILocation } from '@domain/common/location/location.interface';
import { LocationService } from '@domain/common/location';

@Injectable()
export class ContextService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosystemModelService: EcosystemModelService,
    private visualService: VisualService,
    private referenceService: ReferenceService,
    private locationService: LocationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async createContext(contextData: CreateContextInput): Promise<IContext> {
    const context: IContext = Context.create(contextData);

    // Manually create the references to ensure child entities like authorization are created
    context.references = [];
    if (contextData?.references) {
      for (const referenceData of contextData.references) {
        const reference = await this.referenceService.createReference(
          referenceData
        );
        context.references.push(reference);
      }
    }
    context.recommendations = [];
    for (let i = 1; i <= 3; i++) {
      const input: CreateReferenceInput = {
        name: `recommendation${i}`,
      };
      const recommendation = await this.referenceService.createReference(input);
      context.recommendations.push(recommendation);
    }
    context.ecosystemModel =
      await this.ecosystemModelService.createEcosystemModel({});
    context.authorization = new AuthorizationPolicy();
    context.location = await this.locationService.createLocation(
      contextData?.location
    );

    context.visuals = [];
    context.visuals.push(await this.visualService.createVisualBanner());
    context.visuals.push(await this.visualService.createVisualBannerNarrow());
    context.visuals.push(await this.visualService.createVisualAvatar());
    return await this.contextRepository.save(context);
  }

  async getContextOrFail(
    contextID: string,
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
    contextInput: IContext,
    contextUpdateData: UpdateContextInput
  ): Promise<IContext> {
    const context = await this.getContextOrFail(contextInput.id, {
      relations: ['references', 'recommendations', 'location'],
    });
    if (contextUpdateData.tagline) {
      context.tagline = contextUpdateData.tagline;
    }
    if (contextUpdateData.background) {
      context.background = contextUpdateData.background;
    }
    if (contextUpdateData.vision) {
      context.vision = contextUpdateData.vision;
    }
    if (contextUpdateData.impact) {
      context.impact = contextUpdateData.impact;
    }
    if (contextUpdateData.who) {
      context.who = contextUpdateData.who;
    }

    if (contextUpdateData.location) {
      this.locationService.updateLocationValues(
        context.location,
        contextUpdateData.location
      );
    }

    if (contextUpdateData.references) {
      context.references = await this.referenceService.updateReferences(
        context.references,
        contextUpdateData.references
      );
    }

    if (contextUpdateData.recommendations) {
      context.recommendations = await this.referenceService.updateReferences(
        context.recommendations,
        contextUpdateData.recommendations
      );
    }

    return await this.contextRepository.save(context);
  }

  async removeContext(contextID: string): Promise<IContext> {
    // Note need to load it in with all contained entities so can remove fully
    const context = await this.getContextOrFail(contextID, {
      relations: [
        'references',
        'recommendations',
        'ecosystemModel',
        'visuals',
        'location',
      ],
    });

    if (context.references) {
      for (const reference of context.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (context.recommendations) {
      for (const recommendation of context.recommendations) {
        await this.referenceService.deleteReference({
          ID: recommendation.id,
        });
      }
    }

    if (context.ecosystemModel) {
      await this.ecosystemModelService.deleteEcosystemModel(
        context.ecosystemModel.id
      );
    }

    if (context.visuals) {
      for (const visual of context.visuals) {
        await this.visualService.deleteVisual({
          ID: visual?.id,
        });
      }
    }

    if (context.location) {
      await this.locationService.removeLocation(context.location);
    }

    if (context.authorization)
      await this.authorizationPolicyService.delete(context.authorization);

    return await this.contextRepository.remove(context as Context);
  }

  async createReference(
    referenceInput: CreateReferenceOnContextInput
  ): Promise<IReference> {
    const context = await this.getContextOrFail(referenceInput.contextID, {
      relations: ['references'],
    });

    if (!context.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.CONTEXT
      );
    // check there is not already a reference with the same name
    for (const reference of context.references) {
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
    await context.references.push(newReference);
    await this.contextRepository.save(context);

    return newReference;
  }

  async getLocation(contextInput: IContext): Promise<ILocation> {
    const context = await this.getContextOrFail(contextInput.id, {
      relations: ['location'],
    });
    if (!context.location) {
      throw new EntityNotInitializedException(
        `Profile not initialized: ${context.id}`,
        LogContext.COMMUNITY
      );
    }
    return context.location;
  }

  async getReferences(context: IContext): Promise<IReference[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['references'],
    });
    if (!contextLoaded.references)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.references;
  }

  async getRecommendations(context: IContext): Promise<IReference[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['recommendations'],
    });
    if (!contextLoaded.recommendations)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.recommendations;
  }

  async getEcosystemModel(context: IContext): Promise<IEcosystemModel> {
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

  async getVisuals(context: IContext): Promise<IVisual[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['visuals'],
    });
    if (!contextLoaded.visuals)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.visuals;
  }

  async getVisual(context: IContext, name: string): Promise<IVisual> {
    const visuals = await this.getVisuals(context);
    for (const visual of visuals) {
      if (visual.name === name) return visual;
    }

    throw new EntityNotFoundException(
      `Unable to find visual with the name '${name}' on context: ${context.id}`,
      LogContext.CONTEXT
    );
  }
}
