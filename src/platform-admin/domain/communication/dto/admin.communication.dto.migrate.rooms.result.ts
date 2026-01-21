import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunicationAdminMigrateRoomsResult {
  @Field(() => Int, {
    description: 'Number of conversations that had rooms created',
  })
  migrated: number;

  @Field(() => Int, {
    description: 'Number of conversations that failed to have rooms created',
  })
  failed: number;

  @Field(() => [String], {
    description: 'Errors encountered during migration',
  })
  errors: string[];

  constructor() {
    this.migrated = 0;
    this.failed = 0;
    this.errors = [];
  }
}
