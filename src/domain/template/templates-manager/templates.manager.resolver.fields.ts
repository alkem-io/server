import { AuthorizationActorHasPrivilege } from '@common/decorators/authorizationActorHasPrivilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { ITemplatesSet } from '../templates-set/templates.set.interface';
import { ITemplatesManager } from './templates.manager.interface';
import { TemplatesManagerService } from './templates.manager.service';

@Resolver(() => ITemplatesManager)
export class TemplatesManagerResolverFields {
  constructor(private templatesManagerService: TemplatesManagerService) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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
