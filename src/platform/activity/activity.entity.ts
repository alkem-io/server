import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IActivity } from './activity.interface';
import { TINY_TEXT_LENGTH } from '@common/constants';
import { ActivityEventType } from '@common/enums/activity.event.type';

@Entity()
export class Activity extends BaseAlkemioEntity implements IActivity {
  @Column('varchar', { length: 36, nullable: false })
  triggeredBy!: string;

  @Column('varchar', { length: 36, nullable: false })
  resourceID!: string;

  @Column('varchar', { length: 36, nullable: true, default: '' })
  parentID!: string;

  @Column('varchar', { length: 36, nullable: false })
  collaborationID!: string;

  @Column()
  description?: string;

  @Column({
    length: TINY_TEXT_LENGTH,
  })
  type!: ActivityEventType;
}
