import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '../../utils/error-handling/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '../../utils/error-handling/exceptions/entity.not.initialized.exception';
import { LogContext } from '../../utils/logging/logging.contexts';
import { ReferenceInput } from '../reference/reference.dto';
import { IReference } from '../reference/reference.interface';
import { ReferenceService } from '../reference/reference.service';
import { ContextInput } from './context.dto';
import { Context } from './context.entity';
import { IContext } from './context.interface';

@Injectable()
export class ContextService {
  constructor(
    private referenceService: ReferenceService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  initialiseMembers(context: IContext): IContext {
    if (!context.references) {
      context.references = [];
    }

    return context;
  }

  async getContext(contextID: number): Promise<IContext> {
    const context = await this.contextRepository.findOne({ id: contextID });
    if (!context)
      throw new EntityNotFoundException(
        `No context found with the given id: ${contextID}`,
        LogContext.CHALLENGES
      );
    return context;
  }

  async update(
    context: IContext,
    contextInput: ContextInput
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

    // If references are supplied then replace the current references
    if (!context.references) context.references = [];
    if (contextInput.references) {
      context.references = this.referenceService.convertReferences(
        contextInput.references
      );
    }
    await this.contextRepository.save(context);
    return context;
  }

  async createReference(
    contextID: number,
    referenceInput: ReferenceInput
  ): Promise<IReference> {
    const context = await this.getContext(contextID);

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
