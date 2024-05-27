import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateCommunityGuidelinesTemplateInput } from '@domain/template/community-guidelines-template/dto/community.guidelines.template.dto.create';

@InputType()
export class CreateCommunityGuidelinesTemplateOnTemplatesSetInput extends CreateCommunityGuidelinesTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
