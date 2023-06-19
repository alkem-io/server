import { IPost } from '@domain/collaboration/post/post.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
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
    description: 'The Callout type, e.g. Post, Whiteboard, Discussion',
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

  @Field(() => [IPost], {
    nullable: true,
    description: 'The Posts associated with this Callout.',
  })
  posts?: IPost[];

  @Field(() => IPostTemplate, {
    nullable: true,
    description: 'The Post template associated with this Callout.',
  })
  postTemplate?: IPostTemplate;

  @Field(() => [IWhiteboard], {
    nullable: true,
    description: 'The Whiteboardes associated with this Callout.',
  })
  whiteboards?: IWhiteboard[];

  @Field(() => IWhiteboardTemplate, {
    nullable: true,
    description: 'The whiteboard template associated with this Callout.',
  })
  whiteboardTemplate?: IWhiteboardTemplate;

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
