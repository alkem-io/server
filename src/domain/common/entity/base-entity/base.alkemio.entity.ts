import {
  BaseEntity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UUID_LENGTH } from '@common/constants';

export abstract class BaseAlkemioEntity extends BaseEntity {
  @Column('char', {
    length: UUID_LENGTH,
    primary: true,
    generated: 'uuid',
  })
  id!: string;

  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  updatedDate!: Date;

  @VersionColumn()
  version?: number;

  constructor() {
    super();
  }
}
