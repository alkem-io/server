import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { IRoom } from '@domain/communication/room/room.interface';

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

  @Field(() => String, {
    nullable: true,
    description: 'Callout group.',
  })
  group?: string;

  @Field(() => [IAspect], {
    nullable: true,
    description: 'The Aspects associated with this Callout.',
  })
  aspects?: IAspect[];

  @Field(() => IPostTemplate, {
    nullable: true,
    description: 'The Post template associated with this Callout.',
  })
  postTemplate?: IPostTemplate;

  @Field(() => [ICanvas], {
    nullable: true,
    description: 'The Canvases associated with this Callout.',
  })
  canvases?: ICanvas[];

  @Field(() => IWhiteboardTemplate, {
    nullable: true,
    description: 'The whiteboard template associated with this Callout.',
  })
  whiteboardTemplate?: IWhiteboardTemplate;

  @Field(() => IWhiteboardTemplate, {
    nullable: true,
    description: 'The comments associated with this Callout.',
  })
  comments?: IRoom;

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
