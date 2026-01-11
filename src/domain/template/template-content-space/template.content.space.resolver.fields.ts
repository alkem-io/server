import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ITemplateContentSpace } from './template.content.space.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { TemplateContentSpace } from './template.content.space.entity';
import { SpaceAboutLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.about.loader.creator';
import { SpaceCollaborationLoaderCreator } from '@core/dataloader/creators';
import { TemplateContentSpaceService } from './template.content.space.service';

@Resolver(() => ITemplateContentSpace)
export class TemplateContentSpaceResolverFields {
  constructor(
    private templateContentSpaceService: TemplateContentSpaceService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('subspaces', () => [ITemplateContentSpace], {
    nullable: false,
    description: 'The template subspaces for the Template Content Space.',
  })
  async subspaces(
    @Parent() templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace[]> {
    return await this.templateContentSpaceService.getSubspaces(
      templateContentSpace.id
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('about', () => ISpaceAbout, {
    nullable: false,
    description: 'Template to be used to tell About a new Space.',
  })
  async about(
    @Parent() templateContentSpace: ITemplateContentSpace,
    @Loader(SpaceAboutLoaderCreator, {
      parentClassRef: TemplateContentSpace,
    })
    loader: ILoader<ISpaceAbout>
  ): Promise<ISpaceAbout> {
    const about = await loader.load(templateContentSpace.id);
    return about;
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: false,
    description: 'The collaboration for the TemplateContentSpace.',
  })
  async collaboration(
    @Parent() templateContentSpace: ITemplateContentSpace,
    @Loader(SpaceCollaborationLoaderCreator, {
      parentClassRef: TemplateContentSpace,
    })
    loader: ILoader<ICollaboration>
  ): Promise<ICollaboration> {
    return loader.load(templateContentSpace.id);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('settings', () => ISpaceSettings, {
    nullable: false,
    description: 'The settings for this TemplateContentSpace.',
  })
  settings(
    @Parent() templateContentSpace: ITemplateContentSpace
  ): ISpaceSettings {
    return templateContentSpace.settings;
  }
}
