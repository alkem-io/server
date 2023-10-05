import { IPost } from '@domain/collaboration/post/post.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/types';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';

@ObjectType('Callout')
export abstract class ICallout extends IAuthorizable {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

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

  @Field(() => ICalloutFraming, {
    nullable: true,
    description: 'The Callout Framing associated with this Callout.',
  })
  framing!: ICalloutFraming;

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

  // exposed via field resolver
  whiteboards?: IWhiteboard[];

  // exposed via field resolver
  whiteboardRt?: IWhiteboardRt;

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
