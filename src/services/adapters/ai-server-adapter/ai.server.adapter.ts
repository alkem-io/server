import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterAskQuestionInput } from './dto/ai.server.adapter.dto.ask.question';
import { IAiPersonaQuestionResult } from './dto/ai.server.adapter.dto.question.result';

@Injectable()
export class AiServerAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async askQuestion(
    questionInput: AiServerAdapterAskQuestionInput
  ): Promise<IAiPersonaQuestionResult> {
    return {
      question: questionInput.question,
      answer: questionInput.question,
    };
  }
}
