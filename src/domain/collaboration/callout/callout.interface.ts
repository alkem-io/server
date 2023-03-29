import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { IComments } from '@domain/communication/comments/comments.interface';
import { IAspectTemplate } from '@domain/template/aspect-template/aspect.template.interface';
import { ICanvasTemplate } from '@domain/template/canvas-template/canvas.template.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { CalloutGroup } from '@common/enums/callout.group';

@ObjectType('Callout')
export abstract class ICallout extends INameable {
  @Field(() => CalloutType, {
    description: 'The Callout type, e.g. Card, Canvas, Discussion',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    description: 'State of the Callout.',
  })
  state!: CalloutState;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;

  @Field(() => CalloutGroup, {
    nullable: false,
    description: 'Callout group.',
  })
  group!: CalloutGroup;

  @Field(() => [IAspect], {
    nullable: true,
    description: 'The Aspects associated with this Callout.',
  })
  aspects?: IAspect[];

  @Field(() => IAspectTemplate, {
    nullable: true,
    description: 'The Aspect template associated with this Callout.',
  })
  cardTemplate?: IAspectTemplate;

  @Field(() => [ICanvas], {
    nullable: true,
    description: 'The Canvases associated with this Callout.',
  })
  canvases?: ICanvas[];

  @Field(() => ICanvasTemplate, {
    nullable: true,
    description: 'The Canvas template associated with this Callout.',
  })
  canvasTemplate?: ICanvasTemplate;

  @Field(() => IComments, {
    nullable: true,
    description: 'The Comments object for this Callout.',
  })
  comments?: IComments;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Callout.',
  })
  sortOrder!: number;

  activity!: number;

  createdBy?: string;
  publishedBy!: string;
  publishedDate!: Date;
}
