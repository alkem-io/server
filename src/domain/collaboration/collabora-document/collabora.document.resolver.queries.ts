import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';
import { CollaboraEditorUrlResult } from './dto/collabora.editor.url.result';

@InstrumentResolver()
@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService,
    private contributionReporter: ContributionReporterService,
    private communityResolverService: CommunityResolverService
  ) {}

  @Query(() => CollaboraEditorUrlResult, {
    description:
      'Retrieves the editor URL for the specified CollaboraDocument.',
  })
  async collaboraEditorUrl(
    @CurrentActor() actorContext: ActorContext,
    @Args('collaboraDocumentID', { type: () => UUID })
    collaboraDocumentID: string
  ): Promise<CollaboraEditorUrlResult> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        collaboraDocumentID,
        { relations: { profile: true } }
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.READ,
      `read CollaboraDocument editor URL: ${collaboraDocument.id}`
    );

    // Lifecycle analytics (US4 / FR-014): one COLLABORA_DOCUMENT_OPENED record
    // per editor-URL fetch, attributed to the opening actor (like spaceJoined).
    // Resolve the level-zero space the same way the upload path does.
    const community =
      await this.communityResolverService.getCommunityForCollaboraDocumentOrFail(
        collaboraDocument.id
      );
    const levelZeroSpaceID =
      await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    this.contributionReporter.collaboraDocumentOpened(
      {
        id: collaboraDocument.id,
        name: collaboraDocument.profile?.displayName ?? collaboraDocument.id,
        space: levelZeroSpaceID,
      },
      actorContext
    );

    // Identity is resolved from the ActorContext (alkemio_session cookie /
    // forwardAuth), not an inbound Bearer JWT. The WOPI service trusts the
    // X-Alkemio-Actor-Id header the adapter stamps on the internal call.
    return this.collaboraDocumentService.getEditorUrl(
      collaboraDocumentID,
      actorContext.actorID
    );
  }
}
