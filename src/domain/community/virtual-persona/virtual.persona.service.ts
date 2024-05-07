import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VirtualPersona } from './virtual.persona.entity';
import { IVirtualPersona } from './virtual.persona.interface';
import { CreateVirtualPersonaInput as CreateVirtualPersonaInput } from './dto/virtual.persona.dto.create';
import { DeleteVirtualPersonaInput as DeleteVirtualPersonaInput } from './dto/virtual.persona.dto.delete';
import { UpdateVirtualPersonaInput } from './dto/virtual.persona.dto.update';
import { IVirtualPersonaQuestionResult } from './dto/virtual.persona.question.dto.result';
import { VirtualPersonaQuestionInput } from './dto/virtual.persona.question.dto.input';
import { AgentInfo } from '@core/authentication/agent-info';
import { LogContext } from '@common/enums/logging.context';
import { VirtualPersonaEngineAdapterQueryInput } from '@services/adapters/virtual-persona-engine-adapter/dto/virtual.persona.engine.adapter.dto.question.input';
import { VirtualPersonaEngineAdapter } from '@services/adapters/virtual-persona-engine-adapter/virtual.persona.engine.adapter';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { ProfileType } from '@common/enums/profile.type';
import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';

@Injectable()
export class VirtualPersonaService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private virtualPersonaEngineAdapter: VirtualPersonaEngineAdapter,
    private storageAggregatorService: StorageAggregatorService,
    @InjectRepository(VirtualPersona)
    private virtualPersonaRepository: Repository<VirtualPersona>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createVirtualPersona(
    virtualPersonaData: CreateVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const virtual: IVirtualPersona = VirtualPersona.create(virtualPersonaData);
    virtual.authorization = new AuthorizationPolicy();

    // TODO: for now just create a new storage aggregator, to be looked at later where to manage
    // and store the personas (and engine definitions)
    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator();

    virtual.profile = await this.profileService.createProfile(
      virtualPersonaData.profileData,
      ProfileType.VIRTUAL_PERSONA,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(virtual.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(virtual.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });
    // Set the visuals
    let avatarURL = virtualPersonaData.profileData?.avatarURL;
    if (!avatarURL) {
      avatarURL = this.profileService.generateRandomAvatar(
        virtual.profile.displayName,
        ''
      );
    }
    await this.profileService.addVisualOnProfile(
      virtual.profile,
      VisualType.AVATAR,
      avatarURL
    );

    const savedVC = await this.virtualPersonaRepository.save(virtual);
    this.logger.verbose?.(
      `Created new virtual persona with id ${virtual.id}`,
      LogContext.COMMUNITY
    );

    return savedVC;
  }

  async updateVirtualPersona(
    virtualPersonaData: UpdateVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const virtualPersona = await this.getVirtualPersonaOrFail(
      virtualPersonaData.ID,
      {}
    );

    if (virtualPersonaData.prompt !== undefined) {
      virtualPersona.prompt = virtualPersonaData.prompt;
    }

    if (virtualPersonaData.engine !== undefined) {
      virtualPersona.engine = virtualPersonaData.engine;
    }

    return await this.virtualPersonaRepository.save(virtualPersona);
  }

  async deleteVirtualPersona(
    deleteData: DeleteVirtualPersonaInput
  ): Promise<IVirtualPersona> {
    const personaID = deleteData.ID;
    const virtualPersona = await this.getVirtualPersonaOrFail(personaID, {
      relations: {
        authorization: true,
      },
    });

    if (virtualPersona.authorization) {
      await this.authorizationPolicyService.delete(
        virtualPersona.authorization
      );
    }

    const result = await this.virtualPersonaRepository.remove(
      virtualPersona as VirtualPersona
    );
    result.id = personaID;
    return result;
  }

  async getVirtualPersona(
    virtualPersonaID: string,
    options?: FindOneOptions<VirtualPersona>
  ): Promise<IVirtualPersona | null> {
    let virtualPersona: IVirtualPersona | null = null;
    if (virtualPersonaID.length === UUID_LENGTH) {
      virtualPersona = await this.virtualPersonaRepository.findOne({
        ...options,
        where: { ...options?.where, id: virtualPersonaID },
      });
    } else {
      // look up based on nameID
      virtualPersona = await this.virtualPersonaRepository.findOne({
        ...options,
        where: { ...options?.where, nameID: virtualPersonaID },
      });
    }
    return virtualPersona;
  }

  async getVirtualPersonaOrFail(
    virtualID: string,
    options?: FindOneOptions<VirtualPersona>
  ): Promise<IVirtualPersona | never> {
    const virtualPersona = await this.getVirtualPersona(virtualID, options);
    if (!virtualPersona)
      throw new EntityNotFoundException(
        `Unable to find Virtual Persona with ID: ${virtualID}`,
        LogContext.COMMUNITY
      );
    return virtualPersona;
  }

  async save(virtualPersona: IVirtualPersona): Promise<IVirtualPersona> {
    return await this.virtualPersonaRepository.save(virtualPersona);
  }

  async getVirtualPersonas(): Promise<IVirtualPersona[]> {
    const virtualContributors: IVirtualPersona[] =
      await this.virtualPersonaRepository.find();
    return virtualContributors;
  }

  public async askQuestion(
    personaQuestionInput: VirtualPersonaQuestionInput,
    agentInfo: AgentInfo,
    spaceNameID: string
  ): Promise<IVirtualPersonaQuestionResult> {
    const virtualPersona = await this.getVirtualPersonaOrFail(
      personaQuestionInput.virtualPersonaID
    );

    const input: VirtualPersonaEngineAdapterQueryInput = {
      engine: virtualPersona.engine,
      prompt: virtualPersona.prompt,
      userId: agentInfo.userID,
      question: personaQuestionInput.question,
      spaceNameID,
    };

    const response = await this.virtualPersonaEngineAdapter.sendQuery(input);

    return response;
  }

  public async resetUserHistory(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualPersonaEngineAdapter.sendReset({
      engine: VirtualPersonaEngine.ALKEMIO_DIGILEEFOMGEVING,
      userId: agentInfo.userID,
    });
  }

  public async ingest(agentInfo: AgentInfo): Promise<boolean> {
    return this.virtualPersonaEngineAdapter.sendIngest({
      engine: VirtualPersonaEngine.ALKEMIO_DIGILEEFOMGEVING,
      userId: agentInfo.userID,
    });
  }
}
