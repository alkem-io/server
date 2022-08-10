import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { IsOptional } from 'class-validator';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@InputType()
export class CreateCalloutInput extends CreateNameableInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'Callout description.',
  })
  @IsOptional()
  description?: string;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;
}
