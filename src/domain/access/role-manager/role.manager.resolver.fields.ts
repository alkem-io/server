import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { RoleManagerService } from './role.manager.service';
import { IForm } from '@domain/common/form/form.interface';
import { IRoleManager } from './role.manager.interface';
import { RoleManager } from './role.manager.entity';

@Resolver(() => IRoleManager)
export class RoleManagerResolverFields {
  constructor(private roleManagerService: RoleManagerService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this roleManager.',
  })
  @Profiling.api
  async applicationForm(@Parent() roleManager: RoleManager): Promise<IForm> {
    return await this.roleManagerService.getApplicationForm(roleManager);
  }
}
