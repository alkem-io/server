import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { compressText, decompressText } from '@common/utils/compression.util';
import { ActorContext } from '@core/actor-context/actor.context';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { DocumentCopyAuthority } from '@domain/profile-documents/document.copy.authority';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
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
  | 'whiteboard'
  | 'memo';

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
}

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
  union all select f.tid, 'whiteboard', w.id, pr."storageBucketId", null
    from framings f join whiteboard w on w.id = f."whiteboardId" join profile pr on pr.id = w."profileId"
  union all select t.id, 'whiteboard', w.id, pr."storageBucketId", null
    from template t join whiteboard w on w.id = t."whiteboardId" join profile pr on pr.id = w."profileId"
  union all select f.tid, 'memo', m.id, pr."storageBucketId", null
    from framings f join memo m on m.id = f."memoId" join profile pr on pr.id = m."profileId"
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
 * The audit (dry run) lists every such reference; applying the repair copies
 * them for the templates an operator names after reviewing that list. Copying
 * publishes the file to everyone who can read the template, which is why the
 * choice of templates stays with a person.
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async repair(
    templateIDs: string[] | undefined,
    dryRun: boolean,
    actorContext: ActorContext
  ): Promise<AdminTemplateFileRepairResult> {
    if (!dryRun && !templateIDs?.length) {
      throw new ValidationException(
        'Applying the template file repair requires the IDs of the templates to repair; run it as a dry run first to list them',
        LogContext.TEMPLATES
      );
    }
    const slots: Slot[] = await this.entityManager.query(TEMPLATE_SLOTS_SQL, [
      templateIDs?.length ? templateIDs : null,
    ]);

    const references: AdminTemplateForeignFileReference[] = [];
    const failed: AdminTemplateFileRepairIssue[] = [];
    let copiedReferences = 0;

    for (const slot of slots) {
      let foreign: ForeignFile[];
      try {
        if (slot.kind === 'defaultWhiteboardContent' && slot.text) {
          // The entity stores this column compressed; raw SQL reads it as is.
          slot.text = await decompressText(slot.text);
        }
        foreign = await this.findForeignFiles(slot);
      } catch (error) {
        failed.push(this.issue(slot, error));
        continue;
      }
      if (foreign.length === 0) {
        continue;
      }
      let copied = false;
      if (!dryRun) {
        try {
          copied = await this.repairSlot(slot, actorContext);
          if (copied) {
            copiedReferences += foreign.length;
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
          copied,
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
      failed,
    };
  }

  /** The files a slot references that live in some other, existing bucket. */
  private async findForeignFiles(slot: Slot): Promise<ForeignFile[]> {
    const fileIDs = await this.referencedFileIDs(slot);
    if (fileIDs.length === 0) {
      return [];
    }
    const rows: { id: string; storageBucketId: string }[] =
      await this.entityManager.query(
        'select id, "storageBucketId" from file where id = any($1::uuid[])',
        [fileIDs]
      );
    return rows
      .filter(
        row => row.storageBucketId && row.storageBucketId !== slot.bucketID
      )
      .map(row => ({ fileID: row.id, storageBucketID: row.storageBucketId }));
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

  /** Copies the slot's foreign files; true when the stored reference changed. */
  private async repairSlot(
    slot: Slot,
    actorContext: ActorContext
  ): Promise<boolean> {
    // The operator reviewed this template's references and chose to publish
    // them with the template.
    const copyAuthority: DocumentCopyAuthority = { copyAnyFile: true };
    switch (slot.kind) {
      case 'whiteboard':
        return (
          (await this.whiteboardService.copyForeignAssetsIntoOwnBucket(
            slot.entityID,
            actorContext
          )) > 0
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
            { copyAnyFile: true }
          );
        if (materialized.createdDocumentIDs.length === 0) {
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
    const text = slot.text ?? '';
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
    if (!repaired || repaired === text) {
      return false;
    }
    await this.updateText(slot, repaired);
    return true;
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
