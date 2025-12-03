import { Column, Entity, OneToOne } from 'typeorm';
import { IMemo } from './memo.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ENUM_LENGTH } from '@common/constants';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';

@Entity()
export class Memo extends NameableEntity implements IMemo {
  @Column('bytea', { nullable: true })
  content?: Buffer;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @OneToOne(() => CalloutFraming, framing => framing.memo, {
    nullable: true,
  })
  framing?: CalloutFraming;

  @OneToOne(() => CalloutContribution, contribution => contribution.memo, {
    nullable: true,
  })
  contribution?: CalloutContribution;
}
