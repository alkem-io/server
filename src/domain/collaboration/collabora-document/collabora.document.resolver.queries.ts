import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { getActorDisplayName } from '@domain/actor/actor.display.name';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CollaboraDocumentEventsService } from '@domain/collaboration/collabora-document/events/collabora.document.events.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UserService } from '@domain/community/user/user.service';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { ICollaboraDocument } from './collabora.document.interface';
import { CollaboraDocumentService } from './collabora.document.service';
import { CollaboraEditorUrlResult } from './dto/collabora.editor.url.result';

@InstrumentResolver()
@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverQueries {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private authorizationService: AuthorizationService,
    private collaboraDocumentService: CollaboraDocumentService,
    private collaboraDocumentEventsService: CollaboraDocumentEventsService,
    private actorLookupService: ActorLookupService,
    private userService: UserService,
    private configService: ConfigService<AlkemioConfig, true>
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
        { relations: { profile: true, document: true } }
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.READ,
      `read CollaboraDocument editor URL: ${collaboraDocument.id}`
    );

    // Identity is resolved from the ActorContext (alkemio_session cookie /
    // forwardAuth), not an inbound Bearer JWT. The WOPI service trusts the
    // X-Alkemio-Actor-Id header the adapter stamps on the internal call.
    // The actor name is resolved here (the only layer that sees guest names)
    // and forwarded so the WOPI CheckFileInfo UserFriendlyName is the real name
    // instead of "UnknownUser" (#6170 — forwardAuth no longer carries it).
    // Name and language are independent lookups (different services, no data
    // dependency between them) — resolved concurrently rather than adding an
    // avoidable extra round-trip to the document-open path.
    const [actorName, lang] = await Promise.all([
      this.resolveActorName(actorContext),
      this.resolveActorLanguage(actorContext),
    ]);
    const editorUrl = await this.collaboraDocumentService.getEditorUrl(
      collaboraDocument,
      actorContext.actorID,
      actorName,
      lang
    );

    this.collaboraDocumentEventsService.publishOpened(
      collaboraDocument.id,
      collaboraDocument.profile?.displayName ?? collaboraDocument.id,
      actorContext
    );

    return editorUrl;
  }

  @Query(() => Boolean, {
    description:
      'Whether the WOPI save service backing this CollaboraDocument is currently reachable. A side-effect-free health check — unlike collaboraEditorUrl it issues no access token and records no analytics — used to surface a save-path outage in the editor.',
  })
  async collaboraServiceAvailable(
    @CurrentActor() actorContext: ActorContext,
    @Args('collaboraDocumentID', { type: () => UUID })
    collaboraDocumentID: string
  ): Promise<boolean> {
    const collaboraDocument =
      await this.collaboraDocumentService.getCollaboraDocumentOrFail(
        collaboraDocumentID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboraDocument.authorization,
      AuthorizationPrivilege.READ,
      // Static message — no dynamic data (e.g. the document id) in exception messages
      // (.github/copilot-instructions.md coding standards).
      'collabora service health check'
    );
    return this.collaboraDocumentService.isWopiServiceAvailable();
  }

  /**
   * Resolves the human-readable name to surface in the Collabora editor.
   * Guests carry their name on the ActorContext (no Actor row exists for the
   * synthetic guest id); authenticated users get the canonical, PII-safe
   * `getActorDisplayName` (profile.displayName → nameID, never email).
   * Returns undefined when no name can be resolved (anonymous, a failed
   * lookup, or a resolved actor whose display name is blank), letting the WOPI
   * service apply its own fallback rather than surfacing an empty name.
   *
   * Best-effort by design: `actorName` is optional and the editor flow works
   * without it, so a failed actor lookup must NEVER block opening the document
   * (mirrors the best-effort analytics block in collaboraEditorUrl, FR-008).
   */
  private async resolveActorName(
    actorContext: ActorContext
  ): Promise<string | undefined> {
    if (actorContext.isGuest) {
      return actorContext.guestName;
    }
    try {
      const actor = await this.actorLookupService.getActorById(
        actorContext.actorID
      );
      // getActorDisplayName can return '' (blank displayName and empty nameID);
      // coalesce to undefined so WOPI applies its fallback, not a blank name.
      return (actor && getActorDisplayName(actor)) || undefined;
    } catch (e: any) {
      this.logger.warn?.(
        {
          message: 'Failed to resolve actor name for Collabora editor',
          actorId: actorContext.actorID,
          error: e?.message,
        },
        LogContext.COLLABORATION
      );
      return undefined;
    }
  }

  /**
   * Resolves the language to hand Collabora for its editor UI. Always
   * returns a concrete value — never undefined — so Collabora is always
   * told explicitly rather than left to its own browser Accept-Language
   * detection, which resolves inconsistently across its own UI bundles
   * (some fall back to the browser locale, some don't) and produces a
   * visibly mixed-language editor.
   *
   * Only Users carry an explicit preference (`UserSettings.language`).
   * Guests, non-User actors (organizations, virtual contributors), and
   * Users who have never chosen a language (`null` — distinct from a
   * failed/non-User lookup, but both land here) all fall back to the same
   * platform default (`language.default`, `alkemio.yml`) that the rest of
   * the Alkemio UI already resolves to for them.
   *
   * Best-effort by design, mirroring {@link resolveActorName}: a failed
   * lookup must never block opening the document.
   */
  private async resolveActorLanguage(
    actorContext: ActorContext
  ): Promise<string> {
    const platformDefault = this.configService.get('language.default', {
      infer: true,
    });
    if (actorContext.isGuest) {
      return platformDefault;
    }
    try {
      const user = await this.userService.getUserByIdOrFail(
        actorContext.actorID,
        { relations: { settings: true } }
      );
      return user.settings?.language ?? platformDefault;
    } catch (e: any) {
      // "Not found" is expected for non-User actors (organizations, virtual
      // contributors) and logged at verbose to avoid noise on the common
      // path. Anything else (DB/query failure) is promoted to warn so a
      // genuine infrastructure problem doesn't silently blend into that
      // noise — best-effort still means it never blocks opening the
      // document, just that unexpected failures stay operationally visible.
      const logMethod =
        e instanceof EntityNotFoundException ? 'verbose' : 'warn';
      this.logger[logMethod]?.(
        {
          message:
            'No language preference resolved for Collabora editor — falling back to platform default',
          actorId: actorContext.actorID,
          error: e?.message,
        },
        LogContext.COLLABORATION
      );
      return platformDefault;
    }
  }
}
