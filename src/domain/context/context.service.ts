import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
