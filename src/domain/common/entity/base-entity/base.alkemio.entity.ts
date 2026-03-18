import {
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export abstract class BaseAlkemioEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdDate!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedDate!: Date;

  @VersionColumn()
  version?: number;

  constructor() {
    super();
  }
}
