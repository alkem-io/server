import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.create';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';
import { ITemplateBase } from '../template-base/template.base.interface';

@Injectable()
export class CommunityGuidelinesTemplateService {
  constructor(
    @InjectRepository(CommunityGuidelinesTemplate)
    private communityGuidelinesTemplateRepository: Repository<CommunityGuidelinesTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createCommunityGuidelinesTemplate(
    communityGuidelinesTemplateData: CreateCommunityGuidelinesTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplateBase> {
    const communityGuidelinesTemplate: ITemplateBase =
      CommunityGuidelinesTemplate.create(communityGuidelinesTemplateData);
    await this.templateBaseService.initialise(
      communityGuidelinesTemplate,
      communityGuidelinesTemplateData,
      ProfileType.COMMUNITY_GUIDELINES_TEMPLATE,
      storageAggregator
    );

    return await this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }

  async getCommunityGuidelinesTemplateOrFail(
    communityGuidelinesTemplateID: string,
    options?: FindOneOptions<CommunityGuidelinesTemplate>
  ): Promise<ITemplateBase | never> {
    const communityGuidelinesTemplate =
      await this.communityGuidelinesTemplateRepository.findOne({
        ...options,
        where: {
          ...options?.where,
          id: communityGuidelinesTemplateID,
        },
      });
    if (!communityGuidelinesTemplate)
      throw new EntityNotFoundException(
        `Not able to locate CommunityGuidelinesTemplate with the specified ID: ${communityGuidelinesTemplateID}`,
        LogContext.COMMUNICATION
      );
    return communityGuidelinesTemplate;
  }

  async deleteCommunityGuidelinesTemplate(
    communityGuidelinesTemplateInput: ITemplateBase
  ): Promise<ITemplateBase> {
    const communityGuidelinesTemplate =
      await this.getCommunityGuidelinesTemplateOrFail(
        communityGuidelinesTemplateInput.id,
        {
          relations: { profile: true },
        }
      );
    const templateId: string = communityGuidelinesTemplate.id;
    await this.templateBaseService.deleteEntities(communityGuidelinesTemplate);
    const result = await this.communityGuidelinesTemplateRepository.remove(
      communityGuidelinesTemplate as CommunityGuidelinesTemplate
    );
    result.id = templateId;
    return result;
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.communityGuidelinesTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}
