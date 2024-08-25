import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '../templates-set/templates.set.interface';
import { TemplateType } from '@common/enums/template.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('Template')
export abstract class ITemplate extends IAuthorizable {
  @Field(() => IProfile, {
    nullable: false,
    description: 'The Profile for this template.',
  })
  profile!: IProfile;

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

  innovationFlowStates?: string;
}
