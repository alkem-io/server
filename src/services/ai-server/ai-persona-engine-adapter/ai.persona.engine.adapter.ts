import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER } from '@common/constants';
import { AiPersonaEngineAdapterInvocationInput } from './dto/ai.persona.engine.adapter.dto.invocation.input';
import { LogContext } from '@common/enums/logging.context';
import { AiPersonaEngineAdapterInputBase } from './dto/ai.persona.engine.adapter.dto.base';
import { AiPersonaEngineAdapterBaseResponse } from './dto/ai.persona.engine.adapter.dto.base.response';
import { EventBus } from '@nestjs/cqrs';
import { InvokeEngine } from '@services/infrastructure/event-bus/messages/invoke.engine';

enum AiPersonaEngineEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest successful';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class AiPersonaEngineAdapter {
  constructor(
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER)
    private virtualContributorEngineCommunityManager: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private eventBus: EventBus
  ) {}

  public invoke(eventData: AiPersonaEngineAdapterInvocationInput): void {
    this.eventBus.publish(new InvokeEngine(eventData));
  }

  public async sendReset(
    eventData: AiPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualContributorEngineCommunityManager.send(
      { cmd: AiPersonaEngineEventType.RESET },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<AiPersonaEngineAdapterBaseResponse>(response);

      return responseData.result === successfulResetResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.AI_PERSONA_SERVICE_ENGINE
      );
      return false;
    }
  }

  public async sendIngest(
    eventData: AiPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualContributorEngineCommunityManager.send(
      { cmd: AiPersonaEngineEventType.INGEST },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<AiPersonaEngineAdapterBaseResponse>(response);
      return responseData.result === successfulIngestionResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.AI_PERSONA_SERVICE_ENGINE
      );
      return false;
    }
  }
}
