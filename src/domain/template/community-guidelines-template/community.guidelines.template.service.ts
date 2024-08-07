import { FindOneOptions, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LogContext, ProfileType } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.create';
import { CommunityGuidelinesTemplate } from './community.guidelines.template.entity';
import { ITemplateBase } from '../template-base/template.base.interface';
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';
import { UpdateCommunityGuidelinesTemplateInput } from './dto/community.guidelines.template.dto.update';
import { EntityNotFoundException } from '@common/exceptions';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ProfileService } from '@domain/common/profile/profile.service';

@Injectable()
export class CommunityGuidelinesTemplateService {
  constructor(
    @InjectRepository(CommunityGuidelinesTemplate)
    private communityGuidelinesTemplateRepository: Repository<CommunityGuidelinesTemplate>,
    private templateBaseService: TemplateBaseService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private profileService: ProfileService
  ) {}

  async createCommunityGuidelinesTemplate(
    communityGuidelinesTemplateData: CreateCommunityGuidelinesTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate: ICommunityGuidelinesTemplate =
      CommunityGuidelinesTemplate.create(communityGuidelinesTemplateData);

    await this.templateBaseService.initialise(
      communityGuidelinesTemplate,
      communityGuidelinesTemplateData,
      ProfileType.COMMUNITY_GUIDELINES_TEMPLATE,
      storageAggregator
    );

    let guidelinesInput: CreateCommunityGuidelinesInput;

    if (communityGuidelinesTemplateData.communityGuidelinesID) {
      // get the data from the existing guidelines
      const guidelines =
        await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
          communityGuidelinesTemplateData.communityGuidelinesID,
          {
            relations: { profile: true },
          }
        );
      guidelinesInput = {
        profile: {
          displayName: guidelines.profile.displayName,
          description: guidelines.profile.description,
          tagsets: guidelines.profile.tagsets,
          referencesData: guidelines.profile.references,
        },
      };
    } else {
      // get the data from the input
      const guidelinesFromInput =
        communityGuidelinesTemplateData.communityGuidelines!;
      guidelinesInput = {
        profile: {
          displayName: guidelinesFromInput.profile.displayName,
          description: guidelinesFromInput.profile.description,
          tagsets: guidelinesFromInput.profile.tagsets,
          referencesData: guidelinesFromInput.profile.referencesData,
        },
      };
    }

    communityGuidelinesTemplate.guidelines =
      await this.communityGuidelinesService.createCommunityGuidelines(
        guidelinesInput,
        storageAggregator
      );

    return this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }

  public async save(
    communityGuidelinesTemplate: ICommunityGuidelinesTemplate
  ): Promise<ICommunityGuidelinesTemplate> {
    return this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }

  async getCommunityGuidelinesTemplateOrFail(
    communityGuidelinesTemplateID: string,
    options?: FindOneOptions<CommunityGuidelinesTemplate>
  ): Promise<ICommunityGuidelinesTemplate | never> {
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

  async updateCommunityGuidelinesTemplate(
    communityGuidelinesTemplateOriginalId: string,
    communityGuidelinesTemplateNewData: UpdateCommunityGuidelinesTemplateInput
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate =
      await this.getCommunityGuidelinesTemplateOrFail(
        communityGuidelinesTemplateOriginalId,
        {
          relations: { profile: true, guidelines: true },
        }
      );
    await this.templateBaseService.updateTemplateBase(
      communityGuidelinesTemplate,
      communityGuidelinesTemplateNewData
    );
    if (communityGuidelinesTemplateNewData.profile) {
      communityGuidelinesTemplate.profile =
        await this.profileService.updateProfile(
          communityGuidelinesTemplate.profile,
          communityGuidelinesTemplateNewData.profile
        );
    }
    if (communityGuidelinesTemplateNewData.communityGuidelines) {
      communityGuidelinesTemplate.guidelines =
        await this.communityGuidelinesService.update(
          communityGuidelinesTemplate.guidelines,
          // The id is required in UpdateCommunityGuidelinesTemplateInput
          {
            ...communityGuidelinesTemplateNewData.communityGuidelines,
            communityGuidelinesID: communityGuidelinesTemplate.guidelines.id,
          }
        );
    }
    return await this.communityGuidelinesTemplateRepository.save(
      communityGuidelinesTemplate
    );
  }

  async deleteCommunityGuidelinesTemplate(
    communityGuidelinesTemplateOriginal: ITemplateBase
  ): Promise<ICommunityGuidelinesTemplate> {
    const communityGuidelinesTemplate =
      await this.getCommunityGuidelinesTemplateOrFail(
        communityGuidelinesTemplateOriginal.id,
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

  public async getCommunityGuidelines(
    templateID: string
  ): Promise<ICommunityGuidelines> {
    const template =
      await this.communityGuidelinesTemplateRepository.findOneOrFail({
        where: { id: templateID },
        relations: { guidelines: true },
      });

    if (!template?.guidelines) {
      throw new EntityNotFoundException(
        'Community Guidelines not found',
        LogContext.TEMPLATES,
        {
          cause: 'Community Guidelines relation not found',
          templateId: template.id,
        }
      );
    }

    return template.guidelines;
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.communityGuidelinesTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}
