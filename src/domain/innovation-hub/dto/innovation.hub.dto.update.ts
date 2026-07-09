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
    description: `A list of Spaces to include in this Innovation Hub; full replace. An empty list is allowed and hides the Spaces listing. Only valid when type '${InnovationHubType.LIST}' is used.`,
  })
  spaceListFilter?: string[];

  @IsOptional()
  @Field(() => SpaceVisibility, {
    nullable: true,
    description: `Spaces with which visibility this Innovation Hub will display. Only valid when type '${InnovationHubType.VISIBILITY}' is used.`,
  })
  spaceVisibilityFilter?: SpaceVisibility;

  @IsOptional()
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The Innovation Packs curated for this Innovation Hub; full replace. An empty list is allowed and hides the section. Omit to leave unchanged.',
  })
  innovationPackListFilter?: string[];

  @IsOptional()
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The Virtual Contributors curated for this Innovation Hub; full replace. An empty list is allowed and hides the section. Omit to leave unchanged.',
  })
  virtualContributorListFilter?: string[];

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
