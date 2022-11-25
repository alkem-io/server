import { Field, ObjectType } from '@nestjs/graphql';
import { IFileStorageConfig } from './file.storage.config.interface';

@ObjectType('StorageConfig')
export abstract class IStorageConfig {
  @Field(() => IFileStorageConfig, {
    nullable: false,
    description: 'Config for uploading files to Alkemio.',
  })
  file!: IFileStorageConfig;
}
