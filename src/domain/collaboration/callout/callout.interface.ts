import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { ICanvas } from '@domain/common/canvas';
import { INameable } from '@domain/common';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { IComments } from '@domain/communication/comments/comments.interface';

@ObjectType('Callout')
export abstract class ICallout extends INameable {
  @Field(() => Markdown, {
    description: 'The description of this aspect',
  })
  description?: string;

  @Field(() => CalloutType, {
    description: 'The callout type, e.g. Card, Canvas, Discussion',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => [IAspect], {
    nullable: true,
    description: 'The aspects associated with this callout.',
  })
  aspects?: IAspect[];

  @Field(() => [ICanvas], {
    nullable: true,
    description: 'The canvases associated with this callout.',
  })
  canvases?: ICanvas[];

  @Field(() => IComments, {
    nullable: true,
    description: 'The comment messages for this callout.',
  })
  comments?: IComments;
}
