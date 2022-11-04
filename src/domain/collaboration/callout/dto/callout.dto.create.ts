import { Field, InputType } from '@nestjs/graphql';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { NameID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CreateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.create';

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

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CreateAspectTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for Card Callouts.',
  })
  cardTemplate?: CreateAspectTemplateInput;
}
