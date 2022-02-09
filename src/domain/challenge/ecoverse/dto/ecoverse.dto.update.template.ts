import { InputType, Field } from '@nestjs/graphql';
import { UpdateAspectTemplateInput } from './ecoverse.dto.update.template.aspect';

@InputType()
export class UpdateHubTemplateInput {
  @Field(() => [UpdateAspectTemplateInput], {
    nullable: false,
    description:
      'The set of aspect type definitions to be supported by the Hub.',
  })
  aspectTemplates!: UpdateAspectTemplateInput[];
}
