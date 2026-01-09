import { Column, Entity } from 'typeorm';
import { IMemo } from './memo.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ENUM_LENGTH } from '@common/constants';

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
}
