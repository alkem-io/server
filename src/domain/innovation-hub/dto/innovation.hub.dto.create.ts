import { SUBDOMAIN_LENGTH } from '@common/constants';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SUBDOMAIN_REGEX } from '@core/validation';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { UUID } from '@domain/common/scalars';
import { InnovationHubType } from '@domain/innovation-hub/types';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateInnovationHubInput extends CreateNameableInput {
  @MinLength(1)
  @MaxLength(SUBDOMAIN_LENGTH)
  @Matches(SUBDOMAIN_REGEX, {
    message:
      'The provided subdomain is not a valid ARPANET host name. Please refer to https://www.rfc-editor.org/rfc/rfc1034#section-3.5',
  })
  @Field(() => String, {
    description: 'The subdomain to associate the Innovation Hub with.',
  })
  subdomain!: string;

  @Field(() => InnovationHubType, {
    description: 'The type of Innovation Hub.',
  })
  type!: InnovationHubType;

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
}
