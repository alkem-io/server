import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { LogContext } from '@common/enums';
import { VIRTUAL_CONTRIBUTOR_SERVICE } from '@common/constants';
import { VirtualContributorInputBase } from './dto/virtual.contributor.dto.base';
import { VirtualContributorBaseResponse } from './dto/virtual.contributor.dto.base.response';
import { VirtualContributorQueryInput } from './dto/virtual.contributor.dto.query';
import { VirtualContributorQueryResponse } from './dto/virtual.contributor.dto.question.response';
import { IVirtualContributorQueryResult } from '@services/api/virtual-contributor/dto/virtual.contributor.query.result.dto';
import { Source } from '../chat-guidance-adapter/source.type';

enum VirtualContributorEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest successful';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class VirtualContributorAdapter {
  constructor(
    @Inject(VIRTUAL_CONTRIBUTOR_SERVICE)
    private VirtualContributorClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async sendQuery(
    eventData: VirtualContributorQueryInput
  ): Promise<IVirtualContributorQueryResult> {
    let responseData: VirtualContributorQueryResponse | undefined;

    try {
      const response = this.VirtualContributorClient.send<
        VirtualContributorQueryResponse,
        VirtualContributorQueryInput
      >({ cmd: VirtualContributorEventType.QUERY }, eventData);
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

  public async sendReset(
    eventData: VirtualContributorInputBase
  ): Promise<boolean> {
    const response = this.VirtualContributorClient.send(
      { cmd: VirtualContributorEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<VirtualContributorBaseResponse>(
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
    eventData: VirtualContributorInputBase
  ): Promise<boolean> {
    const response = this.VirtualContributorClient.send(
      { cmd: VirtualContributorEventType.INGEST },
      eventData
    );

    try {
      const responseData = await firstValueFrom<VirtualContributorBaseResponse>(
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
