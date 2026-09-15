import { LogContext } from '@common/enums';
import { TemplateType } from '@common/enums/template.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IProfile } from '@domain/common/profile';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplateContentSpace } from '../template-content-space/template.content.space.interface';
import { ClassificationTemplateContent } from './dto/classification.template.content';
import { Template } from './template.entity';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';

@Resolver(() => ITemplate)
export class TemplateResolverFields {
  constructor(private templateService: TemplateService) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Template.',
  })
  async profile(
    @Parent() template: ITemplate,
    @Loader(ProfileLoaderCreator, { parentClassRef: Template })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(template.id);
  }

  @ResolveField('communityGuidelines', () => ICommunityGuidelines, {
    nullable: true,
    description: 'The Community Guidelines for this Template.',
  })
  async communityGuidelines(
    @Parent() template: ITemplate
  ): Promise<ICommunityGuidelines | undefined> {
    if (template.type !== TemplateType.COMMUNITY_GUIDELINES) {
      return undefined;
    }
    return this.templateService.getCommunityGuidelines(template.id);
  }

  @ResolveField('callout', () => ICallout, {
    nullable: true,
    description: 'The Callout for this Template.',
  })
  async callout(@Parent() template: ITemplate): Promise<ICallout | undefined> {
    if (template.type !== TemplateType.CALLOUT) {
      return undefined;
    }
    return this.templateService.getCallout(template.id);
  }

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for this Template.',
  })
  async whiteboard(
    @Parent() template: ITemplate
  ): Promise<IWhiteboard | undefined> {
    if (template.type !== TemplateType.WHITEBOARD) {
      return undefined;
    }
    return this.templateService.getWhiteboard(template.id);
  }

  @ResolveField('contentSpace', () => ITemplateContentSpace, {
    nullable: true,
    description: 'The Space for this Template.',
  })
  async contentSpace(
    @Parent() template: ITemplate
  ): Promise<ITemplateContentSpace | undefined> {
    if (template.type !== TemplateType.SPACE) {
      return undefined;
    }
    return this.templateService.getSpaceContent(template.id);
  }

  @ResolveField('classification', () => ClassificationTemplateContent, {
    nullable: true,
    description:
      'The classification vocabulary; null unless this Template is of type CLASSIFICATION — and never null when it is.',
  })
  classification(
    @Parent() template: ITemplate
  ): ClassificationTemplateContent | undefined {
    if (template.type !== TemplateType.CLASSIFICATION) {
      return undefined;
    }
    // I-9 (enforced on every write path in TemplateService) guarantees a
    // CLASSIFICATION template always carries both columns — a missing one
    // here means I-9 was bypassed, not a legitimate empty state.
    if (
      !template.classificationCardinality ||
      !template.classificationValueSet
    ) {
      throw new RelationshipNotFoundException(
        'Classification Template is missing its cardinality or value set',
        LogContext.TEMPLATES,
        { templateId: template.id }
      );
    }
    return {
      cardinality: template.classificationCardinality,
      values: template.classificationValueSet,
    };
  }
}
