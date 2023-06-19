import { IsOptional } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { InnovationHxbType } from '../types';

@InputType()
export class UpdateInnovationHxbInput extends UpdateNameableInput {
  @IsOptional()
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: `A list of Hubs to include in this Innovation Hxb. Only valid when type '${InnovationHxbType.LIST}' is used.`,
  })
  hubListFilter?: string[];

  @IsOptional()
  @Field(() => HubVisibility, {
    nullable: true,
    description: `Hubs with which visibility this Innovation Hxb will display. Only valid when type '${InnovationHxbType.VISIBILITY}' is used.`,
  })
  hubVisibilityFilter?: HubVisibility;
}
