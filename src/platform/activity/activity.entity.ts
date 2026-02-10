import {
  MESSAGEID_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, Generated } from 'typeorm';
import { IActivity } from './activity.interface';

@Entity()
export class Activity extends BaseAlkemioEntity implements IActivity {
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('uuid', { nullable: false })
  triggeredBy!: string;

  @Column('uuid', { nullable: false })
  resourceID!: string;

  @Column('uuid', { nullable: true })
  parentID?: string;

  @Column('uuid', { nullable: false })
  collaborationID!: string;

  @Column('varchar', { length: MESSAGEID_LENGTH, nullable: true })
  messageID!: string;

  @Column('boolean', { nullable: false })
  visibility!: boolean;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  description?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  type!: ActivityEventType;
}
