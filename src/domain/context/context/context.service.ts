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
import { CreateAspectInput, IAspect } from '@domain/context/aspect';
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
import { IVisualOld } from './dto/context.dto.visual.old.result';

@Injectable()
export class ContextService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private ecosystemModelService: EcosystemModelService,
    private visualService: VisualService,
    private referenceService: ReferenceService,
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
    context.visuals.push(await this.createVisualBanner());
    context.visuals.push(await this.createVisualBannerNarrow());
    context.visuals.push(await this.createVisualAvatar());
    return context;
  }

  private async createVisualBanner(): Promise<IVisual> {
    return await this.visualService.createVisual({
      name: 'banner',
      minWidth: 384,
      maxWidth: 768,
      minHeigt: 32,
      maxHeight: 128,
      aspectRatio: 6,
    });
  }

  private async createVisualBannerNarrow(): Promise<IVisual> {
    return await this.visualService.createVisual({
      name: 'bannerNarrow',
      minWidth: 192,
      maxWidth: 384,
      minHeigt: 32,
      maxHeight: 128,
      aspectRatio: 3,
    });
  }

  private async createVisualAvatar(): Promise<IVisual> {
    return await this.visualService.createVisual({
      name: 'avatar',
      minWidth: 190,
      maxWidth: 400,
      minHeigt: 190,
      maxHeight: 400,
      aspectRatio: 1,
    });
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

  async getAspects(context: IContext): Promise<IAspect[]> {
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

  async getVisualOld(context: IContext): Promise<IVisualOld> {
    return {
      id: context.id,
      banner: (await this.getVisual(context, 'banner')).uri,
      background: (await this.getVisual(context, 'bannerNarrow')).uri,
      avatar: (await this.getVisual(context, 'avatar')).uri,
    };
  }
}
