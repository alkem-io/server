import { UUID_LENGTH } from '@common/constants';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';

import { IOrganization } from '@domain/community/organization/organization.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationPack } from './innovation.pack.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CreateInnovationPackInput } from './dto/innovation.pack.dto.create';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';

@Injectable()
export class InnovationPackService {
  constructor(
    private organizationService: OrganizationService,
    private agentService: AgentService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(InnovationPack)
    private innovationPackRepository: Repository<InnovationPack>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationPack(
    innovationPackData: CreateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack: IInnovationPack =
      InnovationPack.create(innovationPackData);
    innovationPack.authorization = new AuthorizationPolicy();

    innovationPack.templatesSet =
      await this.templatesSetService.createTemplatesSet();

    // save before assigning host in case that fails
    const savedInnovationPack = await this.innovationPackRepository.save(
      innovationPack
    );

    await this.setInnovationPackProvider(
      innovationPack.id,
      innovationPackData.providerID
    );

    return savedInnovationPack;
  }

  async save(innovationPack: IInnovationPack): Promise<IInnovationPack> {
    return await this.innovationPackRepository.save(innovationPack);
  }

  async update(
    innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack = await this.getInnovationPackOrFail(
      innovationPackData.ID
    );

    if (innovationPackData.nameID) {
      if (innovationPackData.nameID !== innovationPack.nameID) {
        // updating the nameID, check new value is allowed
        const updateAllowed = await this.isNameIdAvailable(
          innovationPackData.nameID
        );
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update InnovationPack nameID: the provided nameID is already taken: ${innovationPackData.nameID}`,
            LogContext.CHALLENGES
          );
        }
        innovationPack.nameID = innovationPackData.nameID;
      }
    }

    if (innovationPackData.providerOrgID) {
      await this.setInnovationPackProvider(
        innovationPack.id,
        innovationPackData.providerOrgID
      );
    }

    return await this.innovationPackRepository.save(innovationPack);
  }

  async deleteInnovationPack(
    deleteData: DeleteInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack = await this.getInnovationPackOrFail(deleteData.ID, {
      relations: ['templatesSet'],
    });

    // Remove any host credentials
    const providerOrg = await this.getProvider(innovationPack.id);
    if (providerOrg) {
      const agentHostOrg = await this.organizationService.getAgent(providerOrg);
      providerOrg.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.INNOVATION_PACK_PROVIDER,
        resourceID: innovationPack.id,
      });
      await this.organizationService.save(providerOrg);
    }

    if (innovationPack.templatesSet) {
      await this.templatesSetService.deleteTemplatesSet(
        innovationPack.templatesSet.id
      );
    }

    const result = await this.innovationPackRepository.remove(
      innovationPack as InnovationPack
    );
    result.id = deleteData.ID;
    return result;
  }

  async getInnovationPackOrFail(
    innovationPackID: string,
    options?: FindOneOptions<InnovationPack>
  ): Promise<IInnovationPack> {
    let innovationPack: IInnovationPack | undefined;
    if (innovationPackID.length === UUID_LENGTH) {
      innovationPack = await this.innovationPackRepository.findOne(
        { id: innovationPackID },
        options
      );
    }
    if (!innovationPack) {
      // look up based on nameID
      innovationPack = await this.innovationPackRepository.findOne(
        { nameID: innovationPackID },
        options
      );
    }
    if (!innovationPack)
      throw new EntityNotFoundException(
        `Unable to find InnovationPack with ID: ${innovationPackID}`,
        LogContext.CHALLENGES
      );
    return innovationPack;
  }

  async getTemplatesSetOrFail(
    innovationPackId: string
  ): Promise<ITemplatesSet> {
    const innovationPackWithTemplates = await this.getInnovationPackOrFail(
      innovationPackId,
      {
        relations: ['templatesSet'],
      }
    );
    const templatesSet = innovationPackWithTemplates.templatesSet;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for innovationPack with nameID: ${innovationPackWithTemplates.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return templatesSet;
  }

  async setInnovationPackProvider(
    innovationPackID: string,
    hostOrgID: string
  ): Promise<IInnovationPack> {
    const organization = await this.organizationService.getOrganizationOrFail(
      hostOrgID,
      { relations: ['agent'] }
    );

    const existingHost = await this.getProvider(innovationPackID);

    if (existingHost) {
      const agentExisting = await this.organizationService.getAgent(
        existingHost
      );
      organization.agent = await this.agentService.revokeCredential({
        agentID: agentExisting.id,
        type: AuthorizationCredential.INNOVATION_PACK_PROVIDER,
        resourceID: innovationPackID,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.INNOVATION_PACK_PROVIDER,
      resourceID: innovationPackID,
    });

    await this.organizationService.save(organization);
    return await this.getInnovationPackOrFail(innovationPackID);
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const innovationPackCount = await this.innovationPackRepository.count({
      nameID: nameID,
    });
    if (innovationPackCount != 0) return false;

    return true;
  }

  async getProvider(
    innovationPackID: string
  ): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.INNOVATION_PACK_PROVIDER,
        resourceID: innovationPackID,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one provider for InnovationPack ${innovationPackID} `,
        LogContext.CHALLENGES
      );
    }
    return organizations[0];
  }
}
