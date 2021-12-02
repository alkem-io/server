import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
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
import { IVisual } from '@domain/context/visual/visual.interface';
import { VisualService } from '../visual/visual.service';
import { Visual } from '@domain/context/visual/visual.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICanvas } from '@domain/common/canvas';
import { CreateCanvasInput } from './dto/context.dto.create.canvas';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { CreateReferenceOnContextInput } from './dto/context.dto.create.reference';
import { UpdateContextInput } from './dto/context.dto.update';

@Injectable()
export class ContextService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private ecosystemModelService: EcosystemModelService,
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
    if (!context.visual) context.visual = new Visual();
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

    if (contextInput.visual) {
      const visual = await this.getVisual(context);
      context.visual = await this.visualService.updateVisualValues(
        visual,
        contextInput.visual
      );
    }

    return await this.contextRepository.save(context);
  }

  async removeContext(contextID: string): Promise<IContext> {
    // Note need to load it in with all contained entities so can remove fully
    const context = await this.getContextOrFail(contextID, {
      relations: ['aspects', 'references', 'ecosystemModel', 'visual'],
    });

    if (context.references) {
      for (const reference of context.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (context.ecosystemModel) {
      await this.ecosystemModelService.deleteEcosystemModel(
        context.ecosystemModel.id
      );
    }

    if (context.visual) {
      await this.visualService.deleteVisual({
        ID: context.visual?.id,
      });
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

  async createCanvas(canvasData: CreateCanvasInput): Promise<ICanvas> {
    const contextID = canvasData.contextID;
    const context = await this.getContextOrFail(contextID, {
      relations: ['canvases'],
    });
    if (!context.canvases)
      throw new EntityNotInitializedException(
        `Context (${contextID}) not initialised`,
        LogContext.CONTEXT
      );

    const canvas = await this.canvasService.createCanvas(canvasData);
    context.canvases.push(canvas);
    await this.contextRepository.save(context);
    return canvas;
  }

  async getCanvases(context: IContext): Promise<ICanvas[]> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['canveses'],
    });
    if (!contextLoaded.canvases)
      throw new EntityNotFoundException(
        `Context not initialised, no canveses: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.canvases;
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

  async getVisual(context: IContext): Promise<IVisual> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: ['visual'],
    });
    if (!contextLoaded.visual)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.visual;
  }
}
