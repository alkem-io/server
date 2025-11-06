import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ICallout } from '../callout/callout.interface';
import { ICalloutsSet } from './callouts.set.interface';
import { CalloutsSetService } from './callouts.set.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutsSetArgsCallouts } from './dto/callouts.set.args.callouts';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { CalloutsSetArgsTags } from './dto/callouts.set.args.tags';

@Resolver(() => ICalloutsSet)
export class CalloutsSetResolverFields {
  constructor(private calloutsSetService: CalloutsSetService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('callouts', () => [ICallout], {
    nullable: false,
    description: 'The list of Callouts for this CalloutsSet object.',
  })
  async callouts(
    @Parent() calloutsSet: ICalloutsSet,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: CalloutsSetArgsCallouts
  ) {
    return await this.calloutsSetService.getCalloutsFromCollaboration(
      calloutsSet,
      args,
      agentInfo
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('tagsetTemplates', () => [ITagsetTemplate], {
    nullable: true,
    description: 'The tagset templates on this CalloutsSet.',
  })
  async tagsetTemplates(
    @Parent() calloutsSet: ICalloutsSet
  ): Promise<ITagsetTemplate[]> {
    const tagsetTemplateSet =
      await this.calloutsSetService.getTagsetTemplatesSet(calloutsSet.id);
    return tagsetTemplateSet.tagsetTemplates;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('tags', () => [String], {
    nullable: false,
    description:
      'All the tags of the Callouts and its contributions in this CalloutsSet. Sorted by frequency, then alphabetically.',
  })
  async tags(
    @Parent() calloutsSet: ICalloutsSet,
    @Args({ nullable: true }) args: CalloutsSetArgsTags
  ): Promise<string[]> {
    const tags = await this.calloutsSetService.getAllTags(
      calloutsSet.id,
      args?.classificationTagsets
    );
    return tags;
  }
}
