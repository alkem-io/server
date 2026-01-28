import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITemplate } from '../template/template.interface';
import { TemplateService } from '../template/template.service';
import { ITemplateDefault } from './template.default.interface';

@Resolver(() => ITemplateDefault)
export class TemplateDefaultResolverFields {
  constructor(private templateService: TemplateService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('template', () => ITemplate, {
    nullable: true,
    description: 'The template accessible via this TemplateDefault, if any.',
  })
  async template(
    @Parent() templateDefault: ITemplateDefault
  ): Promise<ITemplate | null> {
    if (!templateDefault.template) {
      return null;
    }

    // Need to reload to ensure authorization is loaded
    return await this.templateService.getTemplateOrFail(
      templateDefault.template.id
    );
  }
}
