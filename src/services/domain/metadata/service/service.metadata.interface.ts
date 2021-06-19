import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ServiceMetadata')
export abstract class IServiceMetadata {
  @Field(() => String, {
    nullable: true,
    description: 'Service name e.g. CT Server',
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Version in the format {major.minor.patch} - using SemVer.',
  })
  version?: string;
}
