import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { replaceRegex } from '@common/utils/replace.regex';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Reference } from '@domain/common/reference/reference.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { StorageBucketNotFoundException } from '@common/exceptions/storage.bucket.not.found.exception';
import { EntityManager, ObjectType } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { MimeTypeNotFoundException } from '@common/exceptions/mime.type.not.found.exception';
import { fromBuffer } from 'file-type';
import {
  DirectStorageBucketEntityType,
  StorageBucketResolverService,
} from '@services/infrastructure/entity-resolver/storage.bucket.resolver.service';

@Injectable()
export class AdminStorageService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private ipfsService: IpfsService,
    private storageBucketService: StorageBucketService,
    private storageBucketResolverService: StorageBucketResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async migrate(agentInfo: AgentInfo): Promise<boolean> {
    await replaceRegex(
      this.entityManager,
      Reference,
      this.ipfsService,
      this.storageBucketService,
      this.storageBucketResolverService,
      agentInfo,
      'uri',
      // 'http:\\/\\/localhost:3000\\/ipfs\\/(Qm[a-zA-Z0-9]{44})$',
      '(^https?:\\/\\/[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*)\\/ipfs\\/(Qm[a-zA-Z0-9]{44})$',
      false,
      this.replaceIpfsWithDocument
    );

    await replaceRegex(
      this.entityManager,
      Visual,
      this.ipfsService,
      this.storageBucketService,
      this.storageBucketResolverService,
      agentInfo,
      'uri',
      // 'http:\\/\\/localhost:3000\\/ipfs\\/(Qm[a-zA-Z0-9]{44})$',
      '(^https?:\\/\\/[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*)\\/ipfs\\/(Qm[a-zA-Z0-9]{44})$',
      true,
      this.replaceIpfsWithDocument
    );
    return true;
  }

  async replaceIpfsWithDocument<T extends BaseAlkemioEntity>(
    entityManager: EntityManager,
    entityClass: ObjectType<T>,
    ipfsService: IpfsService,
    storageBucketService: StorageBucketService,
    storageBucketResolverService: StorageBucketResolverService,
    agentInfo: AgentInfo,
    regex: RegExp,
    matchedText: string,
    row: any,
    anonymousReadAccess: boolean
  ): Promise<string> {
    const entity = await entityManager.findOne(entityClass, {
      where: {
        id: row.id,
      },
      relations: ['profile'],
    });

    const profileID = (entity as any).profile?.id;

    let storageBucketId: string | undefined = undefined;
    // First iterate over all the entity types that have storage spaces directly
    for (const entityName of Object.values(DirectStorageBucketEntityType)) {
      storageBucketId =
        await storageBucketResolverService.getDirectStorageBucketForProfile(
          profileID,
          entityName
        );

      if (storageBucketId) break;
    }
    if (!storageBucketId) {
      const profileResult =
        await storageBucketResolverService.getDocumentProfileType(profileID);

      storageBucketId =
        await storageBucketResolverService.getStorageBucketIdForProfileResult(
          profileResult
        );
    }

    if (!storageBucketId)
      throw new StorageBucketNotFoundException(
        `Unable to find StorageBucket for Profile with ID: ${profileID}`,
        LogContext.STORAGE_BUCKET
      );

    const storageBucket = await storageBucketService.getStorageBucketOrFail(
      storageBucketId
    );

    let baseURL = '';
    let CID = '';
    let replacement = '';
    matchedText.replace(regex, (match, group1, group2) => {
      if (group2) {
        CID = group2;
        baseURL = group1;
        return group1 + replacement;
      }
      return match;
    });

    const fileContents = await ipfsService.getBufferByCID(CID);
    const fileType = await fromBuffer(fileContents);

    if (!fileType?.mime)
      throw new MimeTypeNotFoundException(
        `Mime type not found for document with CID ${CID}`,
        LogContext.STORAGE_BUCKET
      );

    const document = await storageBucketService.uploadFileAsDocumentFromBuffer(
      storageBucket,
      fileContents,
      CID,
      fileType?.mime,
      agentInfo.userID,
      anonymousReadAccess
    );

    replacement = baseURL + `/api/private/rest/storage/document/${document.id}`;
    return replacement;
  }
}
