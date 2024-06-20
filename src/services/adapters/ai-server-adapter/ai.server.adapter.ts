import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiServerAdapterAskQuestionInput } from './dto/ai.server.adapter.dto.ask.question';
import { IAiPersonaQuestionResult } from './dto/ai.server.adapter.dto.question.result';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';

@Injectable()
export class AiServerAdapter {
  constructor(
    private aiServer: AiServerService,
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
