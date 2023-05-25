import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { SUBDOMAIN_LENGTH } from '@common/constants';
import { SUBDOMAIN_REGEX } from '@core/validation';
import { InnovationHubType } from '../types';

@InputType()
export class UpdateInnovationHubInput extends UpdateNameableInput {
  @MinLength(1)
  @MaxLength(SUBDOMAIN_LENGTH)
  @Matches(SUBDOMAIN_REGEX, {
    message:
      'The provided subdomain is not a valid ARPANET host name. Please refer to https://www.rfc-editor.org/rfc/rfc1034#section-3.5',
  })
  @Field(() => String, {
    description: 'The subdomain to associate the Innovation Hub with.',
  })
  subdomain?: string;

  @Field(() => InnovationHubType, {
    nullable: true,
    description: 'The type of Innovation Hub.',
  })
  type?: InnovationHubType;

  @IsOptional()
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: `A list of Hubs to include in this Innovation Hub. Only valid when type '${InnovationHubType.LIST}' is used.`,
  })
  hubListFilter?: string[];

  @IsOptional()
  @Field(() => HubVisibility, {
    nullable: true,
    description: `Hubs with which visibility this Innovation Hub will display. Only valid when type '${InnovationHubType.VISIBILITY}' is used.`,
  })
  hubVisibilityFilter?: HubVisibility;
}
