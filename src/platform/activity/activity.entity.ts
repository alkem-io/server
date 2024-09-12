import { Column, Entity, Generated, Index } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IActivity } from './activity.interface';
import {
  MESSAGEID_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { ActivityEventType } from '@common/enums/activity.event.type';

@Entity()
export class Activity extends BaseAlkemioEntity implements IActivity {
  @Index('IDX_0f03c61020ea0dfa0198c60304')
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  triggeredBy!: string;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  resourceID!: string;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  parentID?: string;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  collaborationID!: string;

  @Column('char', { length: MESSAGEID_LENGTH, nullable: true })
  messageID!: string;

  @Column('boolean', { nullable: false })
  visibility!: boolean;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  description?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  type!: ActivityEventType;
}
