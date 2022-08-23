import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { NameID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@InputType()
export class CreateCalloutInput extends CreateNameableInput {
  @Field(() => Markdown, {
    description: 'Callout description.',
  })
  description!: string;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}
