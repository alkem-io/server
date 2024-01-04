import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';
import { LogContext } from '@common/enums';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { GuidanceEngineInputBase } from './dto/guidance.engine.dto.base';
import { GuidanceEngineBaseResponse } from './dto/guidance.engine.dto.base.response';
import { GuidanceEngineQueryInput } from './dto/guidance.engine.dto.query';
import { GuidanceEngineQueryResponse } from './dto/guidance.engine.dto.question.response';
import { Source } from './source.type';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter';

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
    private guidanceReporterService: GuidanceReporterService
  ) {}

  public async sendQuery(
    eventData: GuidanceEngineQueryInput
  ): Promise<IChatGuidanceQueryResult> {
    let responseData: GuidanceEngineQueryResponse | undefined;

    try {
      const response = this.GuidanceEngineClient.send<
        GuidanceEngineQueryResponse,
        GuidanceEngineQueryInput
      >({ cmd: GuidanceEngineEventType.QUERY }, eventData);
      responseData = await firstValueFrom(response);
    } catch (e) {
      const errorMessage = `Error received from guidance chat server! ${e}`;
      this.logger.error(errorMessage, undefined, LogContext.CHAT_GUIDANCE);
      // not a real answer; just return an error
      return {
        answer: errorMessage,
        question: eventData.question,
      };
    }

    const message = responseData.result;
    let formattedString = message;
    // Check if response is a string containing stringified JSON
    if (typeof message === 'string' && message.startsWith('{')) {
      formattedString = message
        .replace(/\\\\n/g, ' ')
        .replace(/\\\\"/g, '')
        .replace(/<\|im_end\|>/g, '')
        .replace(/content=(['"])(.*?)\1/g, '');
    }

    try {
      const jsonObject = JSON.parse(formattedString);
      const answerId = await this.guidanceReporterService.logAnswer(
        eventData.question,
        jsonObject as GuidanceEngineQueryResponse,
        eventData.userId
      );
      return {
        ...jsonObject,
        id: answerId,
        sources: this.extractMetadata(jsonObject.sources),
      };
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, err?.stack, LogContext.CHAT_GUIDANCE);
      // not a real answer; just return an error
      return {
        answer: errorMessage,
        question: eventData.question,
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

  public async sendIngest(
    eventData: GuidanceEngineInputBase
  ): Promise<boolean> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.INGEST },
      eventData
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

  private extractMetadata(metadata: string): Source[] {
    // deduplicate sources
    const sourceSet = new Set<string>();
    const metadataObjects: Source[] = [];

    // Loop through metadata matches and extract source and title
    for (const metadataMatch of metadata) {
      const uri = metadataMatch;
      const title = metadataMatch;

      const sourceKey = uri ?? title;

      if (sourceSet.has(sourceKey)) {
        continue;
      }

      sourceSet.add(sourceKey);
      metadataObjects.push({ uri, title });
    }

    return metadataObjects;
  }
}
