import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteDocumentInput } from './dto/documentdto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';
import { CreateDocumentInput } from './dto/document.dto.create';
import { Document } from './document.entity';
import { IDocument } from './document.interface';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs/ipfs.upload.exception';
import { IpfsDeleteFailedException } from '@common/exceptions/ipfs/ipfs.delete.exception';

@Injectable()
export class DocumentService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    private ipfsAdapter: IpfsService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createDocument(
    documentInput: CreateDocumentInput
  ): Promise<Document> {
    const document: IDocument = Document.create({ ...documentInput });
    document.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });

    document.authorization = new AuthorizationPolicy();

    return await this.documentRepository.save(document);
  }

  public async deleteDocument(
    deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const documentID = deleteData.ID;
    const document = await this.getDocumentOrFail(documentID, {
      relations: ['tagset'],
    });
    // Delete the underlying document
    await this.removeFile(document.externalID);

    if (document.authorization) {
      await this.authorizationPolicyService.delete(document.authorization);
    }
    if (document.tagset) {
      await this.tagsetService.removeTagset(document.tagset.id);
    }

    const result = await this.documentRepository.remove(document as Document);
    result.id = documentID;
    return result;
  }

  public async getDocumentOrFail(
    documentID: string,
    options?: FindOneOptions<Document>
  ): Promise<IDocument | never> {
    const document = await this.documentRepository.findOne({
      where: { id: documentID },
      ...options,
    });
    if (!document)
      throw new EntityNotFoundException(
        `Not able to locate document with the specified ID: ${documentID}`,
        LogContext.CALENDAR
      );
    return document;
  }
  public async updateDocument(
    documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    const document = await this.getDocumentOrFail(documentData.ID, {
      relations: ['profile'],
    });

    // Copy over the received data
    if (documentData.tagset) {
      if (!document.tagset) {
        throw new EntityNotFoundException(
          `Document not initialised: ${document.id}`,
          LogContext.CALENDAR
        );
      }
      document.tagset = await this.tagsetService.updateTagset(
        documentData.tagset
      );
    }

    await this.documentRepository.save(document);

    return document;
  }

  public async saveDocument(document: IDocument): Promise<IDocument> {
    return await this.documentRepository.save(document);
  }

  public getPubliclyAccessibleURL(document: IDocument): string {
    return this.ipfsAdapter.createIpfsClientEndPoint(document.externalID);
  }

  private async removeFile(CID: string): Promise<boolean> {
    try {
      await this.ipfsAdapter.unpinFile(CID);
      await this.ipfsAdapter.garbageCollect();
    } catch (error) {
      throw new IpfsDeleteFailedException(
        `Ipfs removing file at path ${CID} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
    return true;
  }

  public async uploadFile(buffer: Buffer, fileName: string): Promise<string> {
    try {
      return await this.ipfsAdapter.uploadFileFromBufferCID(buffer);
    } catch (error) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
  }
}
