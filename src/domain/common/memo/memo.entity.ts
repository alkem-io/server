import { ENUM_LENGTH } from '@common/constants';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IMemo } from './memo.interface';

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

  @OneToOne(
    () => CalloutFraming,
    framing => framing.memo,
    {
      nullable: true,
    }
  )
  framing?: CalloutFraming;

  @OneToOne(
    () => CalloutContribution,
    contribution => contribution.memo,
    {
      nullable: true,
    }
  )
  contribution?: CalloutContribution;
}
