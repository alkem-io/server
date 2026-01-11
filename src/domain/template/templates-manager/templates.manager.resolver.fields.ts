import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { TemplatesManagerService } from './templates.manager.service';
import { ITemplatesManager } from './templates.manager.interface';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { AuthorizationActorPrivilege } from '@common/decorators/authorization.actor.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ITemplatesSet } from '@domain/template/templates-set';

@Resolver(() => ITemplatesManager)
export class TemplatesManagerResolverFields {
  constructor(private templatesManagerService: TemplatesManagerService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templateDefaults', () => [ITemplateDefault], {
    nullable: false,
    description: 'The TemplateDefaults in this TemplatesManager.',
  })
  async templateDefaults(
    @Parent() templatesManager: ITemplatesManager
  ): Promise<ITemplateDefault[]> {
    return this.templatesManagerService.getTemplateDefaults(
      templatesManager.id
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templatesSet', () => ITemplatesSet, {
    nullable: true,
    description: 'The templatesSet in use by this TemplatesManager.',
  })
  async templatesSet(
    @Parent() templatesManager: ITemplatesManager
  ): Promise<ITemplatesSet> {
    return await this.templatesManagerService.getTemplatesSetOrFail(
      templatesManager.id
    );
  }
}
