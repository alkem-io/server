import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IReference } from '@domain/common/reference';
import { ContextService } from '@domain/context/context/context.service';
import { CreateAspectInput, IAspect } from '@domain/context/aspect';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CreateReferenceOnContextInput } from '@domain/context/context/dto/context.dto.create.reference';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AspectService } from '@domain/context/aspect/aspect.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateCanvasInput } from './dto/context.dto.create.canvas';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { ICanvas } from '@domain/common/canvas';
@Resolver()
export class ContextResolverMutations {
  constructor(
    private aspectService: AspectService,
    private referenceService: ReferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private contextService: ContextService,
    private canvasService: CanvasService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Context.',
  })
  @Profiling.api
  async createReferenceOnContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceInput') referenceInput: CreateReferenceOnContextInput
  ): Promise<IReference> {
    const context = await this.contextService.getContextOrFail(
      referenceInput.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create reference on context: ${context.id}`
    );
    const reference = await this.contextService.createReference(referenceInput);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        context.authorization
      );
    return await this.referenceService.saveReference(reference);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Context.',
  })
  @Profiling.api
  async createAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: CreateAspectInput
  ): Promise<IAspect> {
    const context = await this.contextService.getContextOrFail(
      aspectData.parentID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create aspect on context: ${context.id}`
    );
    const aspect = await this.contextService.createAspect(aspectData);
    aspect.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        aspect.authorization,
        context.authorization
      );
    return await this.aspectService.saveAspect(aspect);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Create a new Canvas on the Context.',
  })
  @Profiling.api
  async createCanvas(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: CreateCanvasInput
  ): Promise<ICanvas> {
    const context = await this.contextService.getContextOrFail(
      canvasData.contextID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.CREATE,
      `create canvas on context: ${context.id}`
    );
    const canvas = await this.contextService.createCanvas(canvasData);
    canvas.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        canvas.authorization,
        context.authorization
      );
    return await this.canvasService.save(canvas);
  }
}
