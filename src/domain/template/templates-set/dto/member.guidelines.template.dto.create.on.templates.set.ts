import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateMemberGuidelinesTemplateInput } from '@domain/template/member-guidelines-template/dto/member.guidelines.template.dto.create';

@InputType()
export class CreateMemberGuidelinesTemplateOnTemplatesSetInput extends CreateMemberGuidelinesTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
