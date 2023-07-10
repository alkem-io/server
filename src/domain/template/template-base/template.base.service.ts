import { VisualType } from '@common/enums/visual.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateTemplateBaseInput } from './dto/template.base.dto.create';
import { UpdateTemplateBaseInput } from './dto/template.base.dto.update';
import { ITemplateBase } from './template.base.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

@Injectable()
export class TemplateBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,

    private profileService: ProfileService
  ) {}

  async initialise(
    baseTemplate: ITemplateBase,
    baseTemplateData: CreateTemplateBaseInput
  ): Promise<ITemplateBase> {
    baseTemplate.authorization = new AuthorizationPolicy();

    baseTemplate.profile = await this.profileService.createProfile(
      baseTemplateData.profile
    );
    await this.profileService.addTagsetOnProfile(baseTemplate.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: baseTemplateData.tags,
    });
    await this.profileService.addVisualOnProfile(
      baseTemplate.profile,
      VisualType.CARD,
      baseTemplateData.visualUri
    );

    return baseTemplate;
  }

  async updateTemplateBase(
    baseTemplate: ITemplateBase,
    baseTemplateData: UpdateTemplateBaseInput
  ): Promise<ITemplateBase> {
    if (baseTemplateData.profile) {
      baseTemplate.profile = await this.profileService.updateProfile(
        baseTemplate.profile,
        baseTemplateData.profile
      );
    }

    return baseTemplate;
  }

  async deleteEntities(baseTemplate: ITemplateBase) {
    if (baseTemplate.profile) {
      await this.profileService.deleteProfile(baseTemplate.profile.id);
    }
  }
}
