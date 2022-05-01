import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IReference } from '@domain/common/reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { IContext, Context, CreateContextInput } from '@domain/context/context';
import { CreateAspectOnContextInput, IAspect } from '@domain/context/aspect';
import { AspectService } from '@domain/context/aspect/aspect.service';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EcosystemModelService } from '@domain/context/ecosystem-model/ecosystem-model.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Canvas, ICanvas } from '@domain/common/canvas';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { CreateReferenceOnContextInput } from './dto/context.dto.create.reference';
import { UpdateContextInput } from './dto/context.dto.update';
import { CreateCanvasOnContextInput } from './dto/context.dto.create.canvas';
import { VisualService } from '@domain/common/visual/visual.service';
import { IVisual } from '@domain/common/visual/visual.interface';
import { NamingService } from '@services/domain/naming/naming.service';
import { limitAndShuffle } from '@src/common';
import { ILocation } from '@domain/common/location/location.interface';

@Injectable()
export class ContextService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private ecosystemModelService: EcosystemModelService,
    private visualService: VisualService,
    private referenceService: ReferenceService,
    private namingService: NamingService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async createContext(contextData: CreateContextInput): Promise<IContext> {
    const context: IContext = Context.create(contextData);
    context.ecosystemModel =
      await this.ecosystemModelService.createEcosystemModel({});
    context.authorization = new AuthorizationPolicy();
    if (!context.references) context.references = [];
    context.visuals = [];
    context.visuals.push(await this.visualService.createVisualBanner());
    context.visuals.push(await this.visualService.createVisualBannerNarrow());
    context.visuals.push(await this.visualService.createVisualAvatar());
    return context;
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
    context: IContext,
    contextInput: UpdateContextInput
  ): Promise<IContext> {
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
      const references = await this.getReferences(context);
      context.references = await this.referenceService.updateReferences(
        references,
        contextInput.references
      );
    }

    return await this.contextRepository.save(context);
  }

  async removeContext(contextID: string): Promise<IContext> {
    // Note need to load it in with all contained entities so can remove fully
    const context = await this.getContextOrFail(contextID, {
      relations: [
        'aspects',
        'references',
        'ecosystemModel',
        'visuals',
        'canvases',
      ],
    });

    if (context.references) {
      for (const reference of context.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (context.canvases) {
      for (const canvas of context.canvases) {
        await this.canvasService.deleteCanvas(canvas.id);
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

    if (context.authorization)
      await this.authorizationPolicyService.delete(context.authorization);

    if (context.aspects) {
      for (const aspect of context.aspects) {
        await this.aspectService.removeAspect({ ID: aspect.id });
      }
    }

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

  async createAspect(
    aspectData: CreateAspectOnContextInput,
    userID: string
  ): Promise<IAspect> {
    const contextID = aspectData.contextID;
    const context = await this.getContextOrFail(contextID, {
      relations: ['aspects'],
    });
    if (!context.aspects)
      throw new EntityNotInitializedException(
        `Context (${contextID}) not initialised`,
        LogContext.CONTEXT
      );

    if (aspectData.nameID && aspectData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isAspectNameIdAvailableInContext(
          aspectData.nameID,
          context.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Aspect: the provided nameID is already taken: ${aspectData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      aspectData.nameID = this.namingService.createNameID(
        aspectData.displayName || `${aspectData.type}`
      );
    }

    // Check that do not already have an aspect with the same title
    const displayName = aspectData.displayName;
    const existingAspect = context.aspects?.find(
      aspect => aspect.displayName === displayName
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided display name: ${displayName}`,
        LogContext.CONTEXT
      );

    // Not idea: get the communicationGroupID to use for the comments
    const communicationGroupID =
      await this.namingService.getCommunicationGroupIdForContext(context.id);

    const aspect = await this.aspectService.createAspect(
      aspectData,
      userID,
      communicationGroupID
    );
    context.aspects.push(aspect);
    await this.contextRepository.save(context);
    return aspect;
  }

  async createCanvas(canvasData: CreateCanvasOnContextInput): Promise<ICanvas> {
    const contextID = canvasData.contextID;
    const context = await this.getContextOrFail(contextID, {
      relations: ['canvases'],
    });
    if (!context.canvases)
      throw new EntityNotInitializedException(
        `Context (${contextID}) not initialised`,
        LogContext.CONTEXT
      );

    const canvas = await this.canvasService.createCanvas({
      name: canvasData.name,
      value: canvasData.value,
    });
    context.canvases.push(canvas);
    await this.contextRepository.save(context);
    return canvas;
  }

  async getCanvases(
    context: IContext,
    canvasIDs?: string[]
  ): Promise<ICanvas[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['canvases'],
    });
    if (!contextLoaded.canvases)
      throw new EntityNotFoundException(
        `Context not initialised, no canvases: ${context.id}`,
        LogContext.CONTEXT
      );

    if (!canvasIDs) {
      return contextLoaded.canvases;
    }
    const results: ICanvas[] = [];
    for (const canvasID of canvasIDs) {
      const canvas = contextLoaded.canvases.find(
        canvas => canvas.id === canvasID
      );
      if (!canvas)
        throw new EntityNotFoundException(
          `Canvas with requested ID (${canvasID}) not located within current Context: : ${context.id}`,
          LogContext.CONTEXT
        );
      results.push(canvas);
    }
    return results;
  }

  async getCanvasOnContextOrFail(
    contextID: string,
    canvasID: string
  ): Promise<ICanvas> {
    const canvas = await this.canvasService.getCanvasOrFail(canvasID, {
      relations: ['context'],
    });
    const context = (canvas as Canvas).context;
    // check it is a canvas direction on a Context
    if (!context) {
      throw new NotSupportedException(
        `Not able to delete a Canvas that is not contained by Context: ${canvasID}`,
        LogContext.CONTEXT
      );
    }
    if (context.id !== contextID) {
      throw new NotSupportedException(
        `Canvas (${canvasID}) is not a child of supplied context: ${contextID}`,
        LogContext.CONTEXT
      );
    }

    return canvas;
  }

  async deleteCanvas(canvasID: string): Promise<ICanvas> {
    return await this.canvasService.deleteCanvas(canvasID);
  }

  async getAspects(
    context: IContext,
    aspectIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IAspect[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['aspects'],
    });
    if (!contextLoaded.aspects) {
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );
    }
    if (!aspectIDs) {
      const limitAndShuffled = limitAndShuffle(
        contextLoaded.aspects,
        limit,
        shuffle
      );
      const sortedAspects = limitAndShuffled.sort((a, b) =>
        a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1
      );
      return sortedAspects;
    }
    const results: IAspect[] = [];
    for (const aspectID of aspectIDs) {
      const aspect = contextLoaded.aspects.find(
        aspect =>
          aspect.id === aspectID || aspect.nameID === aspectID.toLowerCase()
      );
      if (!aspect)
        throw new EntityNotFoundException(
          `Aspect with requested ID (${aspectID}) not located within current Context: : ${context.id}`,
          LogContext.CONTEXT
        );
      results.push(aspect);
    }

    return results;
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
