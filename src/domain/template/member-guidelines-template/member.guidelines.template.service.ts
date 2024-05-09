import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateMemberGuidelinesTemplateInput } from './dto/member.guidelines.template.dto.create';
import { MemberGuidelinesTemplate } from './member.guidelines.template.entity';
import { IMemberGuidelinesTemplate } from './member.guidelines.template.interface';

@Injectable()
export class MemberGuidelinesTemplateService {
  constructor(
    @InjectRepository(MemberGuidelinesTemplate)
    private memberGuidelinesTemplateRepository: Repository<MemberGuidelinesTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createMemberGuidelinesTemplate(
    memberGuidelinesTemplateData: CreateMemberGuidelinesTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<IMemberGuidelinesTemplate> {
    const memberGuidelinesTemplate: IMemberGuidelinesTemplate =
      MemberGuidelinesTemplate.create(memberGuidelinesTemplateData);
    await this.templateBaseService.initialise(
      memberGuidelinesTemplate,
      memberGuidelinesTemplateData,
      ProfileType.MEMBER_GUIDELINES_TEMPLATE,
      storageAggregator
    );

    return await this.memberGuidelinesTemplateRepository.save(
      memberGuidelinesTemplate
    );
  }

  async getMemberGuidelinesTemplateOrFail(
    memberGuidelinesTemplateID: string,
    options?: FindOneOptions<MemberGuidelinesTemplate>
  ): Promise<IMemberGuidelinesTemplate | never> {
    const memberGuidelinesTemplate =
      await this.memberGuidelinesTemplateRepository.findOne({
        ...options,
        where: {
          ...options?.where,
          id: memberGuidelinesTemplateID,
        },
      });
    if (!memberGuidelinesTemplate)
      throw new EntityNotFoundException(
        `Not able to locate MemberGuidelinesTemplate with the specified ID: ${memberGuidelinesTemplateID}`,
        LogContext.COMMUNICATION
      );
    return memberGuidelinesTemplate;
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.memberGuidelinesTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}
