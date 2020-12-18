import { ObjectType, Field } from '@nestjs/graphql';
import { IServiceMetadata } from './service.metadata.interface';

@ObjectType()
export class ServiceMetadata implements IServiceMetadata {
  @Field(() => String, {
    nullable: true,
    description: 'Service name e.g. CT Server',
  })
  name: string;
  @Field(() => String, {
    nullable: true,
    description: 'Version in the format {major.minor.patch} - using SemVer.',
  })
  version?: string;

  constructor(name: string) {
    this.name = name;
  }
}
