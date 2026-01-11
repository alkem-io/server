import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { TemplateType } from '@common/enums/template.type';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { ITemplateContentSpace } from '../template-content-space/template.content.space.interface';

@ObjectType('Template')
export abstract class ITemplate extends INameable {
  @Field(() => TemplateType, {
    nullable: false,
    description: 'The type for this Template.',
  })
  type!: TemplateType;

  templatesSet?: ITemplatesSet;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'The description for Post Templates to users filling out a new Post based on this Template.',
  })
  postDefaultDescription?: string;

  communityGuidelines?: ICommunityGuidelines;
  callout?: ICallout;
  whiteboard?: IWhiteboard;
  contentSpace?: ITemplateContentSpace;
}
