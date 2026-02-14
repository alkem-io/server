import { ExcalidrawContent } from '@common/interfaces';
import { base64ToBuffer } from '@common/utils';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Whiteboard } from '@domain/common/whiteboard/types';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE, type DrizzleDb } from '@config/drizzle/drizzle.constants';
import { whiteboards as whiteboardsTable } from '@domain/common/whiteboard/whiteboard.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AdminWhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private storageBucketService: StorageBucketService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  public async uploadFilesFromContentToStorageBucket(agentInfo: AgentInfo) {
    const whiteboardResults = await this.db.query.whiteboards.findMany({
      columns: {
        id: true,
        content: true,
      },
      with: {
        profile: {
          columns: {
            id: true,
            displayName: true,
          },
          with: {
            storageBucket: {
              columns: {
                id: true,
              },
            },
          },
        },
      },
    });

    const whiteboardEntities = whiteboardResults as unknown as Whiteboard[];

    const uploadResults = await this._uploadFilesFromContentToStorageBucket(
      whiteboardEntities,
      agentInfo.userID
    );

    return {
      results: [...uploadResults.results],
      errors: [...uploadResults.errors],
      warns: [...uploadResults.warns],
    };
  }

  private async _uploadFilesFromContentToStorageBucket(
    whiteboards: Whiteboard[],
    uploaderId: string
  ) {
    const results: string[] = [];
    const errors: string[] = [];
    const warns: string[] = [];

    const className = whiteboards[0].constructor.name;

    for (const whiteboard of whiteboards) {
      const { id, content, profile } = whiteboard;

      if (!content) {
        continue;
      }

      if (!profile.storageBucket) {
        errors.unshift(`StorageBucket not found for ${className} '${id}'`);
        continue;
      }

      const storageBucketId = profile.storageBucket.id;
      const jsonContent: ExcalidrawContent = JSON.parse(content);

      if (!jsonContent.files) {
        warns.unshift(
          `${className} ${id} - no files attribute found on content`
        );
        continue;
      }

      const files = Object.entries(jsonContent.files);

      if (files.length) {
        for (const [, file] of files) {
          if (!file.dataURL) {
            warns.unshift(
              `${className} ${id} - the file doesn't have any content; might be already transferred`
            );
            continue;
          }

          const imageBuffer = base64ToBuffer(file.dataURL);

          if (!imageBuffer) {
            errors.unshift(`${className} ${id} - unable to decode base64`);
            continue;
          }

          try {
            let document =
              await this.storageBucketService.uploadFileAsDocumentFromBuffer(
                storageBucketId,
                imageBuffer,
                `${className}-${profile.displayName}-${id}`, // we can't really infer the name
                file.mimeType,
                uploaderId
              );
            document = await this.documentService.saveDocument(document);
            const documentAuthorizations =
              await this.documentAuthorizationService.applyAuthorizationPolicy(
                document,
                profile.storageBucket.authorization
              );
            await this.authorizationPolicyService.saveAll(
              documentAuthorizations
            );

            file.url = this.documentService.getPubliclyAccessibleURL(document);
            file.dataURL = '';
          } catch (e) {
            const err = e as Error;
            errors.unshift(`${className} ${id} - ${err.message}`);
          }
        }

        whiteboard.content = JSON.stringify(jsonContent);
        results.unshift(`${className} ${id} - ${files.length} files processed`);
      }
    }

    // Save updated whiteboards in chunks of 20
    for (let i = 0; i < whiteboards.length; i += 20) {
      const chunk = whiteboards.slice(i, i + 20);
      for (const wb of chunk) {
        await this.db
          .update(whiteboardsTable)
          .set({ content: wb.content })
          .where(eq(whiteboardsTable.id, wb.id));
      }
    }
    results.unshift(`${whiteboards.length} ${className}s processed`);

    return { errors, warns, results };
  }
}
