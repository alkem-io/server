import { Column, Entity } from 'typeorm';
import { IMemo } from './memo.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';

@Entity()
export class Memo extends NameableEntity implements IMemo {
  @Column('mediumblob', { nullable: true })
  content?: Buffer;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;
}
