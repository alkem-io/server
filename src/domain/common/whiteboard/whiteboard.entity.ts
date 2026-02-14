import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IWhiteboard } from './whiteboard.interface';
import { IWhiteboardPreviewSettings } from './whiteboard.preview.settings.interface';

export class Whiteboard extends NameableEntity implements IWhiteboard {
  constructor(content?: string) {
    super();
    this.content = content || '';
  }

  content!: string;

  createdBy?: string;

  contentUpdatePolicy!: ContentUpdatePolicy;

  previewSettings!: IWhiteboardPreviewSettings;

  /**
   * Non-persisted field used by GraphQL resolver to surface the computed guest access flag.
   * Default `false` so consumers always receive a defined boolean.
   */
  guestContributionsAllowed = false;

  framing?: CalloutFraming;

  contribution?: CalloutContribution;
}
