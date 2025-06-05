import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollaborativeDocument } from './collaborative-document.entity';
import { ICollaborativeDocument } from './collaborative-document.interface';

@Injectable()
export class CollaborativeDocumentService {
  private readonly logger = new Logger(CollaborativeDocumentService.name);

  constructor(
    @InjectRepository(CollaborativeDocument)
    private documentRepository: Repository<CollaborativeDocument>
  ) {}

  async loadDocument(documentName: string): Promise<Uint8Array | null> {
    try {
      const document = await this.documentRepository.findOne({
        where: { documentName },
      });

      if (!document || !document.yDocState) {
        this.logger.log(`No stored state found for document: ${documentName}`);
        return null;
      }

      this.logger.log(
        `Loaded document state for: ${documentName}, version: ${document.version}`
      );
      return new Uint8Array(document.yDocState);
    } catch (error) {
      this.logger.error(`Failed to load document ${documentName}:`, error);
      return null;
    }
  }

  async saveDocument(
    documentName: string,
    yDocState: Uint8Array,
    textContent: string
  ): Promise<void> {
    try {
      let document = await this.documentRepository.findOne({
        where: { documentName },
      });

      if (document) {
        // Update existing document
        document.yDocState = Buffer.from(yDocState);
        document.content = textContent;
        document.version += 1;
        document.lastModified = new Date();
      } else {
        // Create new document
        document = this.documentRepository.create({
          documentName,
          yDocState: Buffer.from(yDocState),
          content: textContent,
          version: 1,
          lastModified: new Date(),
        });
      }

      await this.documentRepository.save(document);
      this.logger.log(
        `Saved document: ${documentName}, version: ${document.version}`
      );
    } catch (error) {
      this.logger.error(`Failed to save document ${documentName}:`, error);
      throw error;
    }
  }

  async getDocumentInfo(
    documentName: string
  ): Promise<ICollaborativeDocument | null> {
    try {
      return await this.documentRepository.findOne({
        where: { documentName },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get document info for ${documentName}:`,
        error
      );
      return null;
    }
  }

  async getAllDocuments(): Promise<ICollaborativeDocument[]> {
    try {
      return await this.documentRepository.find({
        select: [
          'id',
          'documentName',
          'documentType',
          'version',
          'lastModified',
          'createdDate',
        ],
        order: { lastModified: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Failed to get all documents:', error);
      return [];
    }
  }

  async deleteDocument(documentName: string): Promise<boolean> {
    try {
      const result = await this.documentRepository.delete({ documentName });
      const deleted = !!(result.affected && result.affected > 0);

      if (deleted) {
        this.logger.log(`Deleted document: ${documentName}`);
      } else {
        this.logger.warn(`Document not found for deletion: ${documentName}`);
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete document ${documentName}:`, error);
      return false;
    }
  }
}
