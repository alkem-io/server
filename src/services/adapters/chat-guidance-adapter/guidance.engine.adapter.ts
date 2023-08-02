import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GuidanceEngineQueryResponse } from './dto/guidance.engine.dto.question.response';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LogContext } from '@common/enums';
import { GuidanceEngineInputBase } from './dto/guidance.engine.dto.base';
import { GuidanceEngineBaseResponse } from './dto/guidance.engine.dto.base.response';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';
import { GuidanceEngineQueryInput } from './dto/guidance.engine.dto.query';

enum GuidanceEngineEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest function executed';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class GuidanceEngineAdapter {
  constructor(
    @Inject(CHAT_GUIDANCE_SERVICE) private GuidanceEngineClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async sendQuery(
    eventData: GuidanceEngineQueryInput
  ): Promise<IChatGuidanceQueryResult> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.QUERY },
      eventData
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineQueryResponse>(
        response
      );
      const message = responseData.result;
      let cleanedString = message;
      // Check if response is a string containing stringified JSON
      if (typeof message === 'string' && message.startsWith('{')) {
        cleanedString = message
          .replace(/\\\\n/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/<\|im_end\|>/g, '');
      }

      const jsonObject = JSON.parse(cleanedString);
      const result: IChatGuidanceQueryResult = {
        ...jsonObject,
      };
      return result;
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, LogContext.CHAT_GUIDANCE);
      return {
        answer: errorMessage,
        question: eventData.question,
        sources: '',
      };
    }
  }

  async sendReset(eventData: GuidanceEngineInputBase): Promise<boolean> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineBaseResponse>(
        response
      );

      return responseData.result === successfulResetResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  async sendIngest(): Promise<boolean> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.INGEST },
      {}
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineBaseResponse>(
        response
      );
      return responseData.result === successfulIngestionResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }
}
