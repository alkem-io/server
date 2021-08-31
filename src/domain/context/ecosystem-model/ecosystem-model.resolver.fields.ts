import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { IEcosystemModel } from './ecosystem-model.interface';
import { EcosystemModelService } from './ecosystem-model.service';
import { EcosystemModel } from './ecosystem-model.entity';
import { ICanvas } from '@domain/common/canvas/canvas.interface';

@Resolver(() => IEcosystemModel)
export class EcosystemModelResolverFields {
  constructor(private ecosystemModelService: EcosystemModelService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('canvas', () => ICanvas, {
    nullable: true,
    description: 'The Canvas for visualizing this Ecosystem Model.',
  })
  @Profiling.api
  async canvas(@Parent() ecosystemModel: EcosystemModel): Promise<ICanvas> {
    return await this.ecosystemModelService.getCanvas(ecosystemModel);
  }
}
