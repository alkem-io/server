import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IReference } from '@domain/common/reference';
import { ContextService } from './context.service';
import { CreateAspectInput, IAspect } from '@domain/context';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserInfo } from '@core/authentication';
import { CreateReferenceOnContextInput } from './context.dto.create.reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AspectService } from '../aspect/aspect.service';
@Resolver()
export class ContextResolverMutations {
  constructor(
    private aspectService: AspectService,
    private referenceService: ReferenceService,
    private authorizationEngine: AuthorizationEngineService,
    private contextService: ContextService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @CurrentUser() userInfo: UserInfo,
    @Args('referenceInput') referenceInput: CreateReferenceOnContextInput
  ): Promise<IReference> {
    const context = await this.contextService.getContextOrFail(
      referenceInput.contextID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create reference on context: ${context.id}`
    );
    const reference = await this.contextService.createReference(referenceInput);
    reference.authorization = await this.authorizationEngine.inheritParentAuthorization(
      reference.authorization,
      context.authorization
    );
    return await this.referenceService.saveReference(reference);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Opportunity.',
  })
  @Profiling.api
  async createAspect(
    @CurrentUser() userInfo: UserInfo,
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const context = await this.contextService.getContextOrFail(
      aspectData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create aspect on context: ${context.id}`
    );
    const aspect = await this.contextService.createAspect(aspectData);
    aspect.authorization = await this.authorizationEngine.inheritParentAuthorization(
      aspect.authorization,
      context.authorization
    );
    return await this.aspectService.saveAspect(aspect);
  }
}
