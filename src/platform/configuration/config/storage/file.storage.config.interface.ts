import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('FileStorageConfig')
export abstract class IFileStorageConfig {
  @Field(() => Number, {
    nullable: false,
    description: 'Max file size, in bytes.',
  })
  maxFileSize!: number;

  @Field(() => [String], {
    nullable: false,
    description: 'Allowed mime types for file upload, separated by a coma.',
  })
  mimeTypes!: string[];
}
