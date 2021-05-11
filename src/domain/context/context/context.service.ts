import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  Context,
  IContext,
  Context2,
} from '@domain/context/context';

@Injectable()
export class ContextService {
  constructor(
    private referenceService: ReferenceService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>,
    @InjectRepository(Context2)
    private context2Repository: Repository<Context2>
  ) {}

  async createContext(contextData: CreateContextInput): Promise<IContext> {
    const context: IContext = Context.create(contextData);
    context.references = [];
    return context;
  }

  async createContext2(contextData: CreateContextInput): Promise<Context2> {
    const context = Context2.create(contextData);
    context.extra = 'hello';
    context.references = [];
    const saved = await this.context2Repository.save(context);
    return saved;
  }

  async getContextOrFail(contextID: number): Promise<IContext> {
    const context = await this.contextRepository.findOne({ id: contextID });
    if (!context)
      throw new EntityNotFoundException(
        `No context found with the given id: ${contextID}`,
        LogContext.CHALLENGES
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
    const context = await this.getContextOrFail(contextID);

    // Remove all references
    if (context.references) {
      for (const reference of context.references) {
        await this.referenceService.deleteReference({ ID: reference.id });
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
        LogContext.CHALLENGES
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
}
