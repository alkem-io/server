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
import { ProfileService } from '@domain/common/profile/profile.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';

@Injectable()
export class DocumentService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createDocument(
    documentInput: CreateDocumentInput,
    userID: string
  ): Promise<Document> {
    const document: IDocument = Document.create(documentInput);
    document.profile = await this.profileService.createProfile(
      documentInput.profileData
    );
    await this.profileService.addTagsetOnProfile(document.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: documentInput.tags || [],
    });
    document.authorization = new AuthorizationPolicy();
    document.createdBy = userID;

    return await this.documentRepository.save(document);
  }

  public async deleteDocument(
    deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const documentID = deleteData.ID;
    const document = await this.getDocumentOrFail(documentID, {
      relations: ['profile'],
    });
    if (document.authorization) {
      await this.authorizationPolicyService.delete(document.authorization);
    }
    if (document.profile) {
      await this.profileService.deleteProfile(document.profile.id);
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
    if (documentData.profileData) {
      if (!document.profile) {
        throw new EntityNotFoundException(
          `Document not initialised: ${document.id}`,
          LogContext.CALENDAR
        );
      }
      document.profile = await this.profileService.updateProfile(
        document.profile,
        documentData.profileData
      );
    }

    await this.documentRepository.save(document);

    return document;
  }

  public async saveDocument(document: IDocument): Promise<IDocument> {
    return await this.documentRepository.save(document);
  }

  public async getProfile(document: IDocument): Promise<IProfile> {
    const documentLoaded = await this.getDocumentOrFail(document.id, {
      relations: ['profile'],
    });
    if (!documentLoaded.profile)
      throw new EntityNotFoundException(
        `Card profile not initialised for document: ${document.id}`,
        LogContext.CALENDAR
      );

    return documentLoaded.profile;
  }
}
