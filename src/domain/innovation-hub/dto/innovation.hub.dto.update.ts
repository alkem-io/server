import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { InnovationHubType } from '../types';

@InputType()
export class UpdateInnovationHubInput extends UpdateNameableInput {
  @IsOptional()
  @Field(() => [UUID], {
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

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Flag to control the visibility of the InnovationHub in the platform store.',
  })
  @IsOptional()
  listedInStore?: boolean;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the InnovationHub in searches.',
    nullable: true,
  })
  @IsOptional()
  searchVisibility?: SearchVisibility;
}
