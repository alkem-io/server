import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { HubVisibility } from '@common/enums/hub.visibility';
import { NameID, UUID } from '@domain/common/scalars';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { InnovationHxbType } from '@domain/innovation-hub/types';
import { SUBDOMAIN_LENGTH } from '@common/constants';
import { SUBDOMAIN_REGEX } from '@core/validation';

@InputType()
export class CreateInnovationHxbInput extends CreateNameableInput {
  @MinLength(1)
  @MaxLength(SUBDOMAIN_LENGTH)
  @Matches(SUBDOMAIN_REGEX, {
    message:
      'The provided subdomain is not a valid ARPANET host name. Please refer to https://www.rfc-editor.org/rfc/rfc1034#section-3.5',
  })
  @Field(() => String, {
    description: 'The subdomain to associate the Innovation Hxb with.',
  })
  subdomain!: string;

  @Field(() => InnovationHxbType, {
    description: 'The type of Innovation Hxb.',
  })
  type!: InnovationHxbType;

  @IsOptional()
  @Field(() => [UUID], {
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

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}
