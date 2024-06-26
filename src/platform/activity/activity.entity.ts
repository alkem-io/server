import { Column, Entity, Generated } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IActivity } from './activity.interface';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@common/constants';
import { ActivityEventType } from '@common/enums/activity.event.type';

@Entity()
export class Activity extends BaseAlkemioEntity implements IActivity {
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('char', { length: 36, nullable: false })
  triggeredBy!: string;

  @Column('char', { length: 36, nullable: false })
  resourceID!: string;

  @Column('char', { length: 36, nullable: true, default: '' })
  parentID!: string;

  @Column('char', { length: 36, nullable: false })
  collaborationID!: string;

  @Column('char', { length: 44, nullable: true })
  messageID!: string;

  @Column('boolean', { default: true })
  visibility = true;

  @Column({
    // TODO: It's 255, migrate it to something else
    length: SMALL_TEXT_LENGTH,
  })
  description?: string;

  @Column({
    length: TINY_TEXT_LENGTH,
  })
  type!: ActivityEventType;
}
