import { Injectable } from '@nestjs/common';
import { ReferenceService } from '../reference/reference.service';
import { ContextInput } from './context.dto';
import { IContext } from './context.interface';

@Injectable()
export class ContextService {
  constructor(private referenceService: ReferenceService) {}

  initialiseMembers(context: IContext): IContext {
    if (!context.references) {
      context.references = [];
    }

    return context;
  }

  update(context: IContext, contextInput: ContextInput): void {
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
    if (!context.references)
      throw new Error(`References not defined on context: ${context.id}`);
    if (contextInput.references) {
      this.referenceService.replaceReferences(
        context.references,
        contextInput.references
      );
    }
  }
}
