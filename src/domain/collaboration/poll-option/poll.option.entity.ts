import { MID_TEXT_LENGTH } from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { IUser } from '@domain/community/user/user.interface';
import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { IPoll } from '../poll/poll.interface';
import { IPollOption } from './poll.option.interface';

@Entity()
@Unique(['poll', 'sortOrder'])
export class PollOption extends BaseAlkemioEntity implements IPollOption {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  text!: string;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @Index()
  @ManyToOne('Poll', 'options', {
    nullable: false,
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: IPoll;

  // Derived — computed by field resolvers, not persisted
  voteCount?: number | null;
  votePercentage?: number | null;
  voterIds?: string[] | null;
  voters?: IUser[];
}
