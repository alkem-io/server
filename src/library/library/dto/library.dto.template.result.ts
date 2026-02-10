import { ITemplate } from '@domain/template/template/template.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('TemplateResult')
export abstract class ITemplateResult {
  @Field(() => ITemplate, {
    nullable: false,
    description: 'The Template that is being returned.',
  })
  template!: ITemplate;

  @Field(() => IInnovationPack, {
    nullable: false,
    description:
      'The InnovationPack where this Template is being returned from.',
  })
  innovationPack!: IInnovationPack;
}
