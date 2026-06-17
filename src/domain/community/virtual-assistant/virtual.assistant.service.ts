import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IAssistantCapabilityToggle } from './dto/assistant.capability.toggle.interface';
import { ASSISTANT_ACTOR_NAMEID } from './virtual.assistant.constants';
import { VirtualAssistant } from './virtual.assistant.entity';
import { IVirtualAssistant } from './virtual.assistant.interface';

/**
 * Service for the singleton `virtual-assistant` platform actor. The actor is
 * seeded by the VirtualAssistant migration (no runtime create path; no Kratos
 * identity). This service resolves the singleton, looks it up by ID, and
 * persists the admin per-capability grant (FR-019).
 */
@Injectable()
export class VirtualAssistantService {
  constructor(
    @InjectRepository(VirtualAssistant)
    private readonly virtualAssistantRepository: Repository<VirtualAssistant>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Resolve the singleton `virtual-assistant` actor (by its stable nameID).
   */
  public async getSingletonOrFail(
    options?: Omit<FindOneOptions<VirtualAssistant>, 'where'>
  ): Promise<IVirtualAssistant | never> {
    const virtualAssistant = await this.virtualAssistantRepository.findOne({
      ...options,
      where: { nameID: ASSISTANT_ACTOR_NAMEID },
    });
    if (!virtualAssistant) {
      throw new EntityNotFoundException(
        'Unable to find the singleton VirtualAssistant actor',
        LogContext.COMMUNITY,
        { nameID: ASSISTANT_ACTOR_NAMEID }
      );
    }
    return virtualAssistant;
  }

  public async getVirtualAssistantOrFail(
    virtualAssistantID: string,
    options?: Omit<FindOneOptions<VirtualAssistant>, 'where'>
  ): Promise<IVirtualAssistant | never> {
    const virtualAssistant = await this.virtualAssistantRepository.findOne({
      ...options,
      where: { id: virtualAssistantID },
    });
    if (!virtualAssistant) {
      throw new EntityNotFoundException(
        'Unable to find VirtualAssistant with the given ID',
        LogContext.COMMUNITY,
        { virtualAssistantID }
      );
    }
    return virtualAssistant;
  }

  /**
   * Persist the admin per-capability grant on the actor (PLATFORM_ADMIN-gated
   * at the resolver). Governs system-invoked authority only (FR-019).
   */
  public async setCapabilityGrant(
    virtualAssistantID: string,
    enabledCapabilities: IAssistantCapabilityToggle[]
  ): Promise<IVirtualAssistant> {
    const virtualAssistant = (await this.getVirtualAssistantOrFail(
      virtualAssistantID
    )) as VirtualAssistant;
    virtualAssistant.capabilityGrant = enabledCapabilities;
    const saved = await this.virtualAssistantRepository.save(virtualAssistant);
    this.logger.verbose?.(
      `Updated VirtualAssistant capability grant: ${virtualAssistantID}`,
      LogContext.COMMUNITY
    );
    return saved;
  }
}
