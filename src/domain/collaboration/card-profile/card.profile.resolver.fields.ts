import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICardProfile } from './card.profile.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IReference } from '@domain/common/reference/reference.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CardProfileService } from './card.profile.service';
import { ILocation } from '@domain/common/location/location.interface';

@Resolver(() => ICardProfile)
export class CardProfileResolverFields {
  constructor(private cardProfileService: CardProfileService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'The References for this Aspect.',
  })
  @Profiling.api
  async references(@Parent() cardProfile: ICardProfile) {
    return await this.cardProfileService.getReferences(cardProfile);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('location', () => ILocation, {
    nullable: true,
    description: 'The location for this Profile.',
  })
  @Profiling.api
  async location(@Parent() cardProfile: ICardProfile): Promise<ILocation> {
    return await this.cardProfileService.getLocation(cardProfile);
  }
}
