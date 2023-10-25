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
import { ChatGuidanceLogService } from '@services/api/chat-guidance/chat.guidance.log.service';

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
    private readonly logger: LoggerService,
    private chatGuidanceLogService: ChatGuidanceLogService
  ) {}

  public async sendQuery(
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
      let formattedString = message;
      // Check if response is a string containing stringified JSON
      if (typeof message === 'string' && message.startsWith('{')) {
        formattedString = message
          .replace(/\\\\n/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/<\|im_end\|>/g, '');
      }

      const jsonObject = JSON.parse(formattedString);
      const result: IChatGuidanceQueryResult = {
        ...jsonObject,
        sources: this.extractMetadata(jsonObject.sources),
      };

      await this.chatGuidanceLogService.logAnswer(
        eventData.question,
        jsonObject as GuidanceEngineQueryResponse,
        eventData.userId
      );
      return result;
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, err?.stack, LogContext.CHAT_GUIDANCE);
      return {
        answer: errorMessage,
        question: eventData.question,
        sources: [],
      };
    }
  }

  public async sendReset(eventData: GuidanceEngineInputBase): Promise<boolean> {
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
        err?.stack,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  public async sendIngest(): Promise<boolean> {
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
        err?.stack,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  private extractMetadata(metadata: string): { uri: string }[] {
    this.logger.error('smgth', new Error().stack, 'context');
    // Use regular expressions to extract metadata sections
    const metadataMatches = metadata.match(/metadata=\{.*?\}/g);

    // Initialize an empty array to store extracted objects
    const metadataObjects: { uri: string }[] = [];

    // Loop through metadata matches and extract source and title
    if (metadataMatches) {
      metadataMatches.forEach(metadataMatch => {
        const sourceMatch = metadataMatch.match(/'source': '([^']*)'/);

        if (sourceMatch) {
          const uri = sourceMatch[1];
          metadataObjects.push({ uri });
        }
      });
    }

    return metadataObjects;
  }
}
