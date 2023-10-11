import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Whiteboard } from '@domain/common/whiteboard';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { base64ToArrayBuffer } from '@common/utils';
import { ExcalidrawContent } from '@common/interfaces';
import { WhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.entity';
import { User } from '@domain/community/user';
import { WhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.entity';

@Injectable()
export class AdminWhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @InjectEntityManager() private manager: EntityManager,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService
  ) {}

  public async uploadFilesFromContentToStorageBucket() {
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
    const whiteboardTemplates = await this.manager.find(
      WhiteboardTemplate,
      options
    );
    const whiteboardsRt = await this.manager.find(WhiteboardRt, options);

    const whiteboardResults = await this._uploadFilesFromContentToStorageBucket(
      whiteboards
    );
    const whiteboardTemplateResults =
      await this._uploadFilesFromContentToStorageBucket(whiteboardTemplates);
    const whiteboardRtResults =
      await this._uploadFilesFromContentToStorageBucket(whiteboardsRt);

    return {
      results: [
        ...whiteboardResults.results,
        ...whiteboardTemplateResults.results,
        ...whiteboardRtResults.results,
      ],
      errors: [
        ...whiteboardResults.errors,
        ...whiteboardTemplateResults.errors,
        ...whiteboardRtResults.errors,
      ],
      warns: [
        ...whiteboardResults.warns,
        ...whiteboardTemplateResults.warns,
        ...whiteboardRtResults.warns,
      ],
    };
  }

  private async _uploadFilesFromContentToStorageBucket(
    whiteboards: Whiteboard[] | WhiteboardRt[] | WhiteboardTemplate[]
  ) {
    const results: string[] = [];
    const errors: string[] = [];
    const warns: string[] = [];

    const className = whiteboards[0].constructor.name;

    const adminUser = await this.manager.findOneByOrFail(User, {
      nameID: 'admin-alkemio',
    });
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
            continue; //
          }
          const imageBuffer = base64ToArrayBuffer(file.dataURL);
          try {
            const document =
              await this.storageBucketService.uploadFileAsDocumentFromBuffer(
                storageBucketId,
                imageBuffer,
                `${className}-${profile.displayName}-${id}`, // we can't really infer the name
                file.mimeType,
                adminUser.id,
                false
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
