// import { UseGuards } from '@nestjs/common';
// import { Args, Mutation, Resolver } from '@nestjs/graphql';
// import { TagsetService } from './tagset.service';
// import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
// import { UpdateTagsetInput, Tagset, ITagset } from '@domain/common/tagset';
// import { AuthorizationRolesGlobal } from '@core/authorization/authorization.roles.global';
// import { AuthorizationRulesGuard } from '@core/authorization/authorization.rules.guard';

// @Resolver(() => Tagset)
// export class TagsetResolver {
//   constructor(private tagsetService: TagsetService) {}

//   // @AuthorizationGlobalRoles(
//   //   AuthorizationRolesGlobal.CommunityAdmin,
//   //   AuthorizationRolesGlobal.Admin
//   // )
//   // @UseGuards(AuthorizationRulesGuard)
//   // @Mutation(() => Tagset, {
//   //   description: 'Updates the Tagset.',
//   // })
//   // @Profiling.api
//   // async updateTagset(
//   //   @Args('tagsetData') tagsetData: UpdateTagsetInput
//   // ): Promise<ITagset> {
//   //   return await this.tagsetService.updateTagset(tagsetData);
//   // }
// }
