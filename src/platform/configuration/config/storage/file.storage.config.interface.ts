import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('FileStorageConfig')
export abstract class IFileStorageConfig {
  @Field(() => Number, {
    nullable: false,
    description: 'Max file size, in bytes.',
  })
  maxFileSize!: number;
}
