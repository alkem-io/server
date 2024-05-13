import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileType } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.create';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';
import { ITemplateBase } from '../template-base/template.base.interface';
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';

@Injectable()
export class CommunityGuidelinesTemplateService {
  constructor(
    @InjectRepository(CommunityGuidelinesTemplate)
    private communityGuidelinesTemplateRepository: Repository<CommunityGuidelinesTemplate>,
    private templateBaseService: TemplateBaseService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  async createCommunityGuidelinesTemplate(
    communityGuidelinesTemplateData: CreateCommunityGuidelinesTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate = CommunityGuidelinesTemplate.create(
      communityGuidelinesTemplateData
    );
    await this.templateBaseService.initialise(
      communityGuidelinesTemplate,
      communityGuidelinesTemplateData,
      ProfileType.COMMUNITY_GUIDELINES_TEMPLATE,
      storageAggregator
    );

    if (communityGuidelinesTemplateData.communityGuidelinesID) {
      const guidelines =
        await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
          communityGuidelinesTemplateData.communityGuidelinesID,
          {
            relations: { profile: true },
          }
        );
      communityGuidelinesTemplate.guidelines =
        this.communityGuidelinesService.createCommunityGuidelines({
          profile: {
            displayName: guidelines.profile.displayName,
            description: guidelines.profile.description,
            tagsets: guidelines.profile.tagsets,
            avatarURL: guidelines.profile.visuals?.
          },
        });
    }

    return this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }

  async getCommunityGuidelinesTemplateOrFail(
    communityGuidelinesTemplateID: string,
    options?: FindOneOptions<CommunityGuidelinesTemplate>
  ): Promise<ICommunityGuidelinesTemplate | never> {
    // const communityGuidelinesTemplate =
    //   await this.communityGuidelinesTemplateRepository.findOne({
    //     ...options,
    //     where: {
    //       ...options?.where,
    //       id: communityGuidelinesTemplateID,
    //     },
    //   });
    // if (!communityGuidelinesTemplate)
    //   throw new EntityNotFoundException(
    //     `Not able to locate CommunityGuidelinesTemplate with the specified ID: ${communityGuidelinesTemplateID}`,
    //     LogContext.COMMUNICATION
    //   );
    // return communityGuidelinesTemplate;
    return {
      id: communityGuidelinesTemplateID,
      authorization: undefined,
      profile: {
        id: 'mock-guidelines-profile-id',
        type: ProfileType.COMMUNITY_GUIDELINES_TEMPLATE,
        displayName: 'Mock Community Guidelines Template',
        description: 'Mock Community Guidelines Template Description',
        // tagsets: [
        //   { name: 'default', tags: ['mock', 'community', 'guidelines'] },
        // ],
      },
      guidelines: {
        id: 'mock-guidelines-id',
        title: 'Mock Community Guidelines',
        description: 'Mock Community Guidelines Description',
        content: 'Mock Community Guidelines Content',
        profile: {
          displayName: 'Mock Community Guidelines',
          description: 'Mock Community Guidelines Description',
          // references: [
          //   { name: 'ref 1', description: 'ref 1 description', url: 'www.ref1.com' },
          //   { name: 'ref 2', description: 'ref 2 description', url: 'www.ref2.com' },
          //   { name: 'ref 3', description: 'ref 3 description', url: 'www.ref3.com' },
          // ],
        },
      },
    } as unknown as ICommunityGuidelinesTemplate;
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
