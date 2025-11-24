import {
  Column,
  Entity,
  OneToOne,
} from 'typeorm';
import { IPoll } from './poll.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';

@Entity()
export class Poll extends NameableEntity implements IPoll {
  @Column('json', { nullable: false })
  content!: any;

  @Column({ type: 'boolean', nullable: false, default: false })
  isAnonymous!: boolean;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @OneToOne(() => CalloutFraming, (framing: any) => framing.poll, {
    nullable: true,
  })
  framing?: CalloutFraming;

  @OneToOne(
    () => CalloutContribution,
    (contribution: any) => contribution.poll,
    { nullable: true }
  )
  contribution?: CalloutContribution;

  constructor() {
    super();
    this.content = {};
  }
}
