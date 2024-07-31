import { UUID } from '@domain/common/scalars';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateAccountPlatformSettingsInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Account whose license etc is to be updated.',
  })
  accountID!: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization or User for the Account.',
  })
  @IsOptional()
  hostID?: string;
}
