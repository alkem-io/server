import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { LogContext } from '@common/enums';
import { VIRTUAL_CONTRIBUTOR_SERVICE as VIRTUAL_PERSONA_SERVICE } from '@common/constants';
import { VirtualPersonaInputBase } from './dto/virtual.persona.dto.base';
import { VirtualPersonaBaseResponse } from './dto/virtual.persona.dto.base.response';
import { VirtualPersonaQueryInput } from './dto/virtual.persona.dto.query';
import { VirtualPersonaQueryResponse } from './dto/virtual.persona.dto.question.response';
import { Source } from '../chat-guidance-adapter/source.type';
import { IVirtualPersonaQueryResult } from '@services/api/virtual-persona/dto/virtual.persona.query.result.dto';

enum VirtualPersonaEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest successful';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class VirtualPersonaAdapter {
  constructor(
    @Inject(VIRTUAL_PERSONA_SERVICE)
    private virtualPersonaClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async sendQuery(
    eventData: VirtualPersonaQueryInput
  ): Promise<IVirtualPersonaQueryResult> {
    let responseData: VirtualPersonaQueryResponse | undefined;

    try {
      const response = this.virtualPersonaClient.send<
        VirtualPersonaQueryResponse,
        VirtualPersonaQueryInput
      >({ cmd: VirtualPersonaEventType.QUERY }, eventData);
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
        .replace(/<\|im_end\|>/g, '');
    }

    try {
      const jsonObject = JSON.parse(formattedString);

      return {
        ...jsonObject,
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

  public async sendReset(eventData: VirtualPersonaInputBase): Promise<boolean> {
    const response = this.virtualPersonaClient.send(
      { cmd: VirtualPersonaEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<VirtualPersonaBaseResponse>(
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
    eventData: VirtualPersonaInputBase
  ): Promise<boolean> {
    const response = this.virtualPersonaClient.send(
      { cmd: VirtualPersonaEventType.INGEST },
      eventData
    );

    try {
      const responseData = await firstValueFrom<VirtualPersonaBaseResponse>(
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
