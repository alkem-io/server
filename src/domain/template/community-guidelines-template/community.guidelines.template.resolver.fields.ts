import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CommunityGuidelinesTemplateService } from '@domain/template/community-guidelines-template/community.guidelines.template.service';
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';

@Resolver(() => ICommunityGuidelinesTemplate)
export class CommunityGuidelinesTemplateResolverFields {
  constructor(
    private guidelinesTemplateService: CommunityGuidelinesTemplateService
  ) {}
  @UseGuards(GraphqlGuard)
  @ResolveField('guidelines', () => [ICommunityGuidelines], {
    nullable: false,
    description: 'The CalloutTemplates in this TemplatesSet.',
  })
  async guidelines(
    @Parent() templatesSet: ICommunityGuidelinesTemplate
  ): Promise<ICommunityGuidelines> {
    return this.guidelinesTemplateService.getCommunityGuidelines(
      templatesSet.id
    );
  }
}
