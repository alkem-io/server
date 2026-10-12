import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { compressText, decompressText } from '@common/utils/compression.util';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { DocumentCopyAuthority } from '@domain/profile-documents/document.copy.authority';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import {
  AdminTemplateFileRepairIssue,
  AdminTemplateFileRepairResult,
  AdminTemplateForeignFileReference,
  AdminTemplateMissingFileReference,
} from './dto/admin.template.file.repair.result';

/** Where in a template a file reference sits, and how it is rewritten. */
type SlotKind =
  | 'profileDescription'
  | 'referenceUri'
  | 'visualUri'
  | 'linkUri'
  | 'defaultPostDescription'
  | 'postTemplateDescription'
  | 'defaultWhiteboardContent'
  | 'spaceAboutWho'
  | 'spaceAboutWhy'
  | 'flowStateDescription'
  | 'whiteboard'
  | 'memo'
  | 'collaboraDocument';

/** Column each text slot is stored in. Fixed here, never taken from input. */
const TEXT_COLUMNS: Partial<Record<SlotKind, [table: string, column: string]>> =
  {
    profileDescription: ['profile', 'description'],
    referenceUri: ['reference', 'uri'],
    visualUri: ['visual', 'uri'],
    linkUri: ['link', 'uri'],
    defaultPostDescription: [
      'callout_contribution_defaults',
      'postDescription',
    ],
    postTemplateDescription: ['template', 'postDefaultDescription'],
    spaceAboutWho: ['space_about', 'who'],
    spaceAboutWhy: ['space_about', 'why'],
    flowStateDescription: ['innovation_flow_state', 'description'],
    defaultWhiteboardContent: [
      'callout_contribution_defaults',
      'whiteboardContent',
    ],
  };

const SINGLE_URI_SLOTS: ReadonlySet<SlotKind> = new Set([
  'referenceUri',
  'visualUri',
  'linkUri',
]);

interface Slot {
  templateID: string;
  templateName: string;
  kind: SlotKind;
  entityID: string;
  bucketID: string;
  text: string | null;
}

interface ForeignFile {
  fileID: string;
  storageBucketID: string;
  ownerCanRead: boolean;
}

interface TemplateOwnerRow {
  templateID: string;
  spaceID: string | null;
  accountID: string | null;
}

/** Who holds each template: a space's library, an innovation pack, or the platform. */
const TEMPLATE_OWNERS_SQL = `
select t.id "templateID", s.id "spaceID", ip."accountId" "accountID"
  from template t
  left join templates_manager tm on tm."templatesSetId" = t."templatesSetId"
  left join space s on s."templatesManagerId" = tm.id
  left join innovation_pack ip on ip."templatesSetId" = t."templatesSetId"
 where t.id = any($1::uuid[])
`;

/** A document URL on any host, capturing the part before the file ID. */
const HOSTED_DOCUMENT_URL_PATTERN =
  /https?:\/\/[^/\s)"'\]]+\/api\/private\/rest\/storage\/document\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

const DOCUMENT_URL_PATTERN =
  /\/api\/private\/rest\/storage\/document\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

/**
 * Every place a template stores a file reference, with the bucket that place
 * owns. A Space template is walked through its content space, its subspaces
 * and each of their callouts; a Callout template through its callout.
 */
const TEMPLATE_SLOTS_SQL = `
with recursive tcs_tree as (
  select t.id tid, tcs.id cid from template t
    join template_content_space tcs on tcs.id = t."contentSpaceId"
  union all
  select tr.tid, c.id from tcs_tree tr
    join template_content_space c on c."parentSpaceId" = tr.cid
), tpl_callouts as (
  select tr.tid, c.id callout_id from tcs_tree tr
    join template_content_space tcs on tcs.id = tr.cid
    join collaboration co on co.id = tcs."collaborationId"
    join callout c on c."calloutsSetId" = co."calloutsSetId"
  union all
  select t.id, t."calloutId" from template t where t."calloutId" is not null
), framings as (
  select tc.tid, cf.* , c."contributionDefaultsId" from tpl_callouts tc
    join callout c on c.id = tc.callout_id
    join callout_framing cf on cf.id = c."framingId"
), profiles as (
  select t.id tid, t."profileId" pid from template t
  union all select t.id, cg."profileId" from template t
    join community_guidelines cg on cg.id = t."communityGuidelinesId"
  union all select t.id, w."profileId" from template t
    join whiteboard w on w.id = t."whiteboardId"
  union all select tr.tid, sa."profileId" from tcs_tree tr
    join template_content_space tcs on tcs.id = tr.cid
    join space_about sa on sa.id = tcs."aboutId"
  union all select tr.tid, cg."profileId" from tcs_tree tr
    join template_content_space tcs on tcs.id = tr.cid
    join space_about sa on sa.id = tcs."aboutId"
    join community_guidelines cg on cg.id = sa."guidelinesId"
  union all select tr.tid, f."profileId" from tcs_tree tr
    join template_content_space tcs on tcs.id = tr.cid
    join collaboration co on co.id = tcs."collaborationId"
    join innovation_flow f on f.id = co."innovationFlowId"
  union all select f.tid, f."profileId" from framings f
  union all select f.tid, w."profileId" from framings f
    join whiteboard w on w.id = f."whiteboardId"
  union all select f.tid, l."profileId" from framings f
    join link l on l.id = f."linkId"
  union all select f.tid, m."profileId" from framings f
    join memo m on m.id = f."memoId"
), slots as (
  select p.tid, 'profileDescription' kind, pr.id entity_id, pr."storageBucketId" bucket_id, pr.description txt
    from profiles p join profile pr on pr.id = p.pid
  union all select p.tid, 'referenceUri', r.id, pr."storageBucketId", r.uri
    from profiles p join profile pr on pr.id = p.pid join reference r on r."profileId" = pr.id
  union all select p.tid, 'visualUri', v.id, pr."storageBucketId", v.uri
    from profiles p join profile pr on pr.id = p.pid join visual v on v."profileId" = pr.id
  union all select f.tid, 'linkUri', l.id, pr."storageBucketId", l.uri
    from framings f join link l on l.id = f."linkId" join profile pr on pr.id = f."profileId"
  union all select f.tid, 'visualUri', v.id, mg."storageBucketId", v.uri
    from framings f join media_gallery mg on mg.id = f."mediaGalleryId" join visual v on v."mediaGalleryId" = mg.id
  union all select f.tid, 'defaultPostDescription', d.id, pr."storageBucketId", d."postDescription"
    from framings f join profile pr on pr.id = f."profileId"
    join callout_contribution_defaults d on d.id = f."contributionDefaultsId"
  union all select f.tid, 'defaultWhiteboardContent', d.id, pr."storageBucketId", d."whiteboardContent"
    from framings f join profile pr on pr.id = f."profileId"
    join callout_contribution_defaults d on d.id = f."contributionDefaultsId"
    where d."whiteboardContent" is not null and d."whiteboardContent" <> ''
  union all select t.id, 'postTemplateDescription', t.id, pr."storageBucketId", t."postDefaultDescription"
    from template t join profile pr on pr.id = t."profileId"
  union all select tr.tid, 'spaceAboutWho', sa.id, pr."storageBucketId", sa.who
    from tcs_tree tr join template_content_space tcs on tcs.id = tr.cid
    join space_about sa on sa.id = tcs."aboutId" join profile pr on pr.id = sa."profileId"
  union all select tr.tid, 'spaceAboutWhy', sa.id, pr."storageBucketId", sa.why
    from tcs_tree tr join template_content_space tcs on tcs.id = tr.cid
    join space_about sa on sa.id = tcs."aboutId" join profile pr on pr.id = sa."profileId"
  union all select tr.tid, 'flowStateDescription', st.id, pr."storageBucketId", st.description
    from tcs_tree tr join template_content_space tcs on tcs.id = tr.cid
    join collaboration co on co.id = tcs."collaborationId"
    join innovation_flow f on f.id = co."innovationFlowId" join profile pr on pr.id = f."profileId"
    join innovation_flow_state st on st."innovationFlowId" = f.id
  union all select f.tid, 'whiteboard', w.id, pr."storageBucketId", null
    from framings f join whiteboard w on w.id = f."whiteboardId" join profile pr on pr.id = w."profileId"
  union all select t.id, 'whiteboard', w.id, pr."storageBucketId", null
    from template t join whiteboard w on w.id = t."whiteboardId" join profile pr on pr.id = w."profileId"
  union all select f.tid, 'memo', m.id, pr."storageBucketId", null
    from framings f join memo m on m.id = f."memoId" join profile pr on pr.id = m."profileId"
  -- An office document's file lives in its storage aggregator's direct bucket.
  union all select f.tid, 'collaboraDocument', cd.id, sa."directStorageId", null
    from framings f join collabora_document cd on cd.id = f."collaboraDocumentId"
    join profile pr on pr.id = f."profileId"
    join storage_bucket sb on sb.id = pr."storageBucketId"
    join storage_aggregator sa on sa.id = sb."storageAggregatorId"
)
select s.tid "templateID", tp."displayName" "templateName", s.kind, s.entity_id "entityID",
       s.bucket_id "bucketID", s.txt "text"
  from slots s
  join template t on t.id = s.tid
  join profile tp on tp.id = t."profileId"
 where s.bucket_id is not null
   and ($1::uuid[] is null or s.tid = any($1::uuid[]))
   and (s.txt is null or s.kind = 'defaultWhiteboardContent' or s.txt like '%/storage/document/%')
 order by s.tid, s.kind, s.entity_id
`;

/**
 * One-off repair of templates saved before files were copied into them.
 *
 * A template may reference a file stored in some other bucket, typically the
 * (sub)space it was saved from. Such a file is copied into a new space only
 * when its creator can read it, so a template holding such references produces
 * broken images and links for everyone else. The repair copies each of those
 * files into the bucket of the template entity that references it.
 *
 * Copying publishes the file to everyone who can read the template, so a file
 * is copied only when the template's owner can read it: the admins of the space
 * whose library holds the template, or of the account that holds its
 * innovation pack. Templates do not record who saved them; the owner is the
 * closest stand-in for that person. A platform template's owner is any
 * registered user, since the platform roles that manage those templates can
 * read every space. Any other file stays referenced as written.
 */
@Injectable()
export class AdminTemplateFileRepairService {
  constructor(
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    private readonly profileDocumentsService: ProfileDocumentsService,
    private readonly storageBucketService: StorageBucketService,
    private readonly whiteboardService: WhiteboardService,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly authorizationService: AuthorizationService,
    private readonly documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async repair(
    templateIDs: string[] | undefined,
    dryRun: boolean,
    actorContext: ActorContext
  ): Promise<AdminTemplateFileRepairResult> {
    const slots: Slot[] = await this.entityManager.query(TEMPLATE_SLOTS_SQL, [
      templateIDs?.length ? templateIDs : null,
    ]);
    const owners = await this.templateOwners(slots);

    const references: AdminTemplateForeignFileReference[] = [];
    const missingFiles: AdminTemplateMissingFileReference[] = [];
    const failed: AdminTemplateFileRepairIssue[] = [];
    let copiedReferences = 0;

    for (const slot of slots) {
      const owner = owners.get(slot.templateID);
      if (!owner) {
        continue;
      }
      let foreign: ForeignFile[];
      let missing: string[];
      try {
        if (slot.kind === 'defaultWhiteboardContent' && slot.text) {
          // The entity stores this column compressed; raw SQL reads it as is.
          slot.text = await decompressText(slot.text);
        }
        ({ foreign, missing } = await this.findForeignFiles(slot, owner));
      } catch (error) {
        failed.push(this.issue(slot, error));
        continue;
      }
      for (const fileID of missing) {
        missingFiles.push({
          templateID: slot.templateID,
          templateName: slot.templateName,
          location: slot.kind,
          entityID: slot.entityID,
          fileID,
        });
      }
      if (foreign.length === 0) {
        continue;
      }
      const copyable = foreign.filter(file => file.ownerCanRead).length;
      let copied = false;
      if (!dryRun && copyable > 0) {
        try {
          copied = await this.repairSlot(slot, owner, actorContext);
          if (copied) {
            copiedReferences += copyable;
          } else {
            failed.push(
              this.issue(
                slot,
                "Nothing was rewritten: the reference does not use this server's document URL"
              )
            );
          }
        } catch (error) {
          failed.push(this.issue(slot, error));
        }
      }
      for (const file of foreign) {
        references.push({
          templateID: slot.templateID,
          templateName: slot.templateName,
          location: slot.kind,
          entityID: slot.entityID,
          fileID: file.fileID,
          storageBucketID: file.storageBucketID,
          ownerCanRead: file.ownerCanRead,
          copied: copied && file.ownerCanRead,
        });
      }
    }

    return {
      dryRun,
      templatesScanned: new Set(slots.map(slot => slot.templateID)).size,
      templatesWithForeignFiles: new Set(references.map(r => r.templateID))
        .size,
      references,
      copiedReferences,
      missingFiles,
      failed,
    };
  }

  /**
   * The credentials each template's owner holds, as a registered user, keyed
   * by template.
   */
  private async templateOwners(
    slots: Slot[]
  ): Promise<Map<string, ActorContext>> {
    const templateIDs = [...new Set(slots.map(slot => slot.templateID))];
    if (templateIDs.length === 0) {
      return new Map();
    }
    const rows: TemplateOwnerRow[] = await this.entityManager.query(
      TEMPLATE_OWNERS_SQL,
      [templateIDs]
    );
    return new Map(
      rows.map(row => {
        // No actor ID: a copy keeps its original uploader as creator, and the
        // operator gains no creator rights on template files.
        const owner = new ActorContext();
        owner.credentials = [
          { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
        ];
        if (row.spaceID) {
          owner.credentials.push({
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: row.spaceID,
          });
        } else if (row.accountID) {
          owner.credentials.push({
            type: AuthorizationCredential.ACCOUNT_ADMIN,
            resourceID: row.accountID,
          });
        }
        return [row.templateID, owner];
      })
    );
  }

  /**
   * The files a slot references that live in some other bucket, and the IDs of
   * referenced files that no longer exist.
   */
  private async findForeignFiles(
    slot: Slot,
    owner: ActorContext
  ): Promise<{ foreign: ForeignFile[]; missing: string[] }> {
    const fileIDs = await this.referencedFileIDs(slot);
    if (fileIDs.length === 0) {
      return { foreign: [], missing: [] };
    }
    const rows: {
      id: string;
      storageBucketId: string;
      authorization: IAuthorizationPolicy | null;
    }[] = await this.entityManager.query(
      `select f.id, f."storageBucketId",
              case when ap.id is null then null else json_build_object(
                'id', ap.id, 'type', ap.type,
                'credentialRules', ap."credentialRules",
                'privilegeRules', ap."privilegeRules") end authorization
         from file f left join authorization_policy ap on ap.id = f."authorizationId"
        where f.id = any($1::uuid[])`,
      [fileIDs]
    );
    const found = new Set(rows.map(row => row.id));
    const missing = fileIDs.filter(fileID => !found.has(fileID));
    const foreign = rows
      .filter(
        row => row.storageBucketId && row.storageBucketId !== slot.bucketID
      )
      .map(row => ({
        fileID: row.id,
        storageBucketID: row.storageBucketId,
        ownerCanRead:
          row.authorization !== null &&
          this.authorizationService.isAccessGranted(
            owner,
            row.authorization,
            AuthorizationPrivilege.READ
          ),
      }));
    return { foreign, missing };
  }

  private async referencedFileIDs(slot: Slot): Promise<string[]> {
    switch (slot.kind) {
      case 'whiteboard':
        return this.whiteboardService.listAssetFileIDs(
          await this.whiteboardService.getWhiteboardContent(slot.entityID)
        );
      case 'defaultWhiteboardContent':
        return this.whiteboardService.listAssetFileIDs(slot.text ?? '');
      case 'memo':
        return this.fileIDsInText(await this.memoMarkdown(slot.entityID));
      case 'collaboraDocument': {
        const [document]: { documentId: string | null }[] =
          await this.entityManager.query(
            'select "documentId" from collabora_document where id = $1',
            [slot.entityID]
          );
        return document?.documentId ? [document.documentId] : [];
      }
      default:
        return this.fileIDsInText(slot.text ?? '');
    }
  }

  private fileIDsInText(text: string): string[] {
    return [
      ...new Set(
        [...text.matchAll(DOCUMENT_URL_PATTERN)].map(match =>
          match[1].toLowerCase()
        )
      ),
    ];
  }

  /**
   * Copies the slot's foreign files the owner can read; true when the stored
   * reference changed.
   */
  private async repairSlot(
    slot: Slot,
    owner: ActorContext,
    operator: ActorContext
  ): Promise<boolean> {
    const copyAuthority: DocumentCopyAuthority = { actorContext: owner };
    switch (slot.kind) {
      case 'whiteboard':
        // The rewrite goes through the whiteboard's live room as the operator,
        // so the operator needs the same right to edit it as any other editor.
        await this.assertOperatorCanEditWhiteboard(slot.entityID, operator);
        return await this.whiteboardService.copyForeignAssetsIntoOwnBucket(
          slot.entityID,
          owner,
          operator.actorID
        );
      case 'collaboraDocument':
        throw new ValidationException(
          "Office document files are reported, not repaired: re-attach the document in the template's callout",
          LogContext.TEMPLATES
        );
      case 'memo':
        // A memo's text lives in a collaborative document; rewriting it through
        // Markdown would drop formatting Markdown cannot express. Reported only.
        throw new ValidationException(
          'Memo references are reported, not repaired: re-insert the image in the memo',
          LogContext.TEMPLATES
        );
      case 'defaultWhiteboardContent': {
        const materialized =
          await this.whiteboardService.materializeContentIntoBucket(
            slot.text ?? '',
            slot.bucketID,
            { actorContext: owner }
          );
        if (
          !(await this.whiteboardService.assetFilesChanged(
            slot.text ?? '',
            materialized.content
          ))
        ) {
          return false;
        }
        try {
          await this.updateText(slot, await compressText(materialized.content));
        } catch (error) {
          await this.whiteboardService.deleteMaterializedContentDocuments(
            materialized.createdDocumentIDs
          );
          throw error;
        }
        return true;
      }
    }

    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(slot.bucketID, {
        relations: { documents: true },
      });
    const text = await this.withCurrentHost(slot.text ?? '');
    const repaired = SINGLE_URI_SLOTS.has(slot.kind)
      ? await this.profileDocumentsService.reuploadFileOnStorageBucket(
          text,
          storageBucket,
          false,
          copyAuthority
        )
      : await this.profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket(
          text,
          storageBucket,
          copyAuthority
        );
    if (!repaired || repaired === slot.text) {
      return false;
    }
    await this.updateText(slot, repaired);
    return true;
  }

  /**
   * Points document URLs written with another host (a retired domain, or a
   * copy of another environment's data) at this server, for files that exist
   * here, so the copy step recognises them.
   */
  private async withCurrentHost(text: string): Promise<string> {
    const base = this.documentService.getDocumentsBaseUrlPath();
    const foreignHosted = [
      ...text.matchAll(HOSTED_DOCUMENT_URL_PATTERN),
    ].filter(match => !match[0].startsWith(base));
    if (foreignHosted.length === 0) {
      return text;
    }
    const rows: { id: string }[] = await this.entityManager.query(
      'select id from file where id = any($1::uuid[])',
      [[...new Set(foreignHosted.map(match => match[1].toLowerCase()))]]
    );
    const existing = new Set(rows.map(row => row.id));
    return text.replace(HOSTED_DOCUMENT_URL_PATTERN, (url, fileID: string) =>
      existing.has(fileID.toLowerCase()) && !url.startsWith(base)
        ? `${base}/${fileID}`
        : url
    );
  }

  private async assertOperatorCanEditWhiteboard(
    whiteboardID: string,
    operator: ActorContext
  ): Promise<void> {
    const [row]: { authorization: IAuthorizationPolicy | null }[] =
      await this.entityManager.query(
        `select json_build_object('id', ap.id, 'type', ap.type,
                  'credentialRules', ap."credentialRules",
                  'privilegeRules', ap."privilegeRules") authorization
           from whiteboard w join authorization_policy ap on ap.id = w."authorizationId"
          where w.id = $1`,
        [whiteboardID]
      );
    if (
      !row?.authorization ||
      !this.authorizationService.isAccessGranted(
        operator,
        row.authorization,
        AuthorizationPrivilege.UPDATE_CONTENT
      )
    ) {
      throw new ValidationException(
        'The operator cannot edit this whiteboard: run the repair as a user who also holds Platform Content Full Access',
        LogContext.TEMPLATES
      );
    }
  }

  private async updateText(slot: Slot, value: string): Promise<void> {
    const column = TEXT_COLUMNS[slot.kind];
    if (!column) {
      throw new ValidationException(
        `No stored column for template file reference kind '${slot.kind}'`,
        LogContext.TEMPLATES
      );
    }
    const [table, field] = column;
    await this.entityManager.query(
      `update "${table}" set "${field}" = $1 where id = $2`,
      [value, slot.entityID]
    );
  }

  private async memoMarkdown(memoID: string): Promise<string> {
    const [memo]: { contentPointer: string | null }[] =
      await this.entityManager.query(
        'select "contentPointer" from memo where id = $1',
        [memoID]
      );
    if (!memo?.contentPointer) {
      return '';
    }
    const [item] = await this.fileServiceAdapter.getContentBatch([
      memo.contentPointer,
    ]);
    if (!item?.found || !item.contentBase64) {
      return '';
    }
    return yjsStateToMarkdown(Buffer.from(item.contentBase64, 'base64'));
  }

  private issue(slot: Slot, error: unknown): AdminTemplateFileRepairIssue {
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.warn?.(
      {
        message: 'Template file repair could not process a reference',
        templateId: slot.templateID,
        location: slot.kind,
        entityId: slot.entityID,
        reason,
      },
      LogContext.TEMPLATES
    );
    return {
      templateID: slot.templateID,
      location: slot.kind,
      entityID: slot.entityID,
      reason,
    };
  }
}
