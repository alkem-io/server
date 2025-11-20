import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { WhiteboardContent } from '../scalars/scalar.whiteboard.content';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { IWhiteboardPreviewSettings } from './whiteboard.preview.settings.interface';

@ObjectType('Whiteboard')
export abstract class IWhiteboard extends INameable {
  @Field(() => WhiteboardContent, {
    nullable: false,
    description: 'The visual content of the Whiteboard.',
  })
  content!: string;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Whiteboard content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @Field(() => IWhiteboardPreviewSettings, {
    description: 'The preview settings for the Whiteboard.',
    nullable: false,
  })
  previewSettings!: IWhiteboardPreviewSettings;

  /**
   * Computed value exposed via `guestContributionsAllowed` resolver; retained on the interface for
   * local hydrations and service methods that override it before returning to the API layer.
   * Always treated as a defined boolean at runtime, so there is no GraphQL decorator here.
   */
  guestContributionsAllowed!: boolean;

  createdBy?: string;

  callout?: ICallout;
}
