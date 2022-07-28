import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {
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
