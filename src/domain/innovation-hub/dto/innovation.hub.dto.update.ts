import { IsOptional } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { InnovationHubType } from '../types';

@InputType()
export class UpdateInnovationHubInput extends UpdateNameableInput {
  @IsOptional()
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: `A list of Spaces to include in this Innovation Hub. Only valid when type '${InnovationHubType.LIST}' is used.`,
  })
  spaceListFilter?: string[];

  @IsOptional()
  @Field(() => SpaceVisibility, {
    nullable: true,
    description: `Spaces with which visibility this Innovation Hub will display. Only valid when type '${InnovationHubType.VISIBILITY}' is used.`,
  })
  spaceVisibilityFilter?: SpaceVisibility;
}
