import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('PostTemplate')
export abstract class IPostTemplate extends ITemplateBase {
  @Field(() => String, {
    nullable: false,
    description: 'The type for this Post.',
  })
  type!: string;

  @Field(() => Markdown, {
    nullable: false,
    description:
      'The default description to show to users filling our a new instance.',
  })
  defaultDescription!: string;
}
