import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IMemo } from './memo.interface';

export class Memo extends NameableEntity implements IMemo {
  content?: Buffer;

  createdBy?: string;

  contentUpdatePolicy!: ContentUpdatePolicy;

  framing?: CalloutFraming;

  contribution?: CalloutContribution;
}
