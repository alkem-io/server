import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreatePostTemplateInput } from '@domain/template/post-template/dto/post.template.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreatePostTemplateOnTemplatesSetInput extends CreatePostTemplateInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
