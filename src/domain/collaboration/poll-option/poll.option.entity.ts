import { MID_TEXT_LENGTH } from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { IUser } from '@domain/community/user/user.interface';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { IPollOption } from './poll.option.interface';

@Entity()
@Unique(['poll', 'sortOrder'])
export class PollOption extends BaseAlkemioEntity implements IPollOption {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  text!: string;

  @Column('int', { nullable: false })
  sortOrder!: number;

  @ManyToOne('Poll', 'options', {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: unknown;

  // Derived — computed by field resolvers, not persisted
  voteCount?: number;
  votePercentage?: number;
  voters?: IUser[];
}
