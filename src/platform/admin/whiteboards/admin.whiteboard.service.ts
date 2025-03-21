import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { base64ToBuffer } from '@common/utils';
import { ExcalidrawContent } from '@common/interfaces';
import { Whiteboard } from '@domain/common/whiteboard/types';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class AdminWhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @InjectEntityManager() private manager: EntityManager,
    private storageBucketService: StorageBucketService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentService: DocumentService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  public async uploadFilesFromContentToStorageBucket(agentInfo: AgentInfo) {
    // select the ids of the entities, needed for the save
    const options: FindManyOptions = {
      relations: {
        profile: {
          storageBucket: true,
        },
      },
      select: {
        id: true,
        profile: {
          id: true,
          displayName: true,
          storageBucket: {
            id: true,
          },
        },
        content: true,
      },
    };

    const whiteboards = await this.manager.find(Whiteboard, options);

    const whiteboardResults = await this._uploadFilesFromContentToStorageBucket(
      whiteboards,
      agentInfo.userID
    );

    return {
      results: [...whiteboardResults.results],
      errors: [...whiteboardResults.errors],
      warns: [...whiteboardResults.warns],
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

    await this.manager.save(whiteboards, {
      chunk: 20,
    });
    results.unshift(`${whiteboards.length} ${className}s processed`);

    return { errors, warns, results };
  }
}
