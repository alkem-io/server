import { Field, ObjectType } from '@nestjs/graphql';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('MemberGuidelinesTemplate')
export abstract class IMemberGuidelinesTemplate extends ITemplateBase {
  @Field(() => String, {
    nullable: false,
    description: 'The type for this Member Guidelines.',
  })
  type!: string;

  @Field(() => Markdown, {
    nullable: false,
    description:
      'The default description to show to users filling our a new instance.',
  })
  defaultDescription!: string;
}
