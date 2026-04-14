import { CurrentActor, Headers } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';
import { CollaboraEditorUrlResult } from './dto/collabora.editor.url.result';

@InstrumentResolver()
@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService
  ) {}

  @Query(() => CollaboraEditorUrlResult, {
    description:
      'Retrieves the editor URL for the specified CollaboraDocument.',
  })
  async collaboraEditorUrl(
    @CurrentActor() actorContext: ActorContext,
    @Args('collaboraDocumentID', { type: () => UUID })
    collaboraDocumentID: string,
    @Headers('authorization') authorizationHeader: string
  ): Promise<CollaboraEditorUrlResult> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        collaboraDocumentID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.READ,
      `read CollaboraDocument editor URL: ${collaboraDocument.id}`
    );

    // Extract the JWT from the Authorization header
    const jwt = authorizationHeader?.replace('Bearer ', '') ?? '';

    return this.collaboraDocumentService.getEditorUrl(collaboraDocumentID, jwt);
  }
}
