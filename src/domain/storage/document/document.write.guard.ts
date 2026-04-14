import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { Document } from './document.entity';

/**
 * TypeORM subscriber that prevents direct writes to the document table.
 * The Go file-service-go owns document CRUD — the server is read-only.
 * Any accidental INSERT/UPDATE/DELETE from server code will throw at runtime.
 */
@EventSubscriber()
export class DocumentWriteGuard implements EntitySubscriberInterface<Document> {
  listenTo() {
    return Document;
  }

  beforeInsert(_event: InsertEvent<Document>): void {
    throw new Error(
      'Direct INSERT to document table is forbidden. Use FileServiceAdapter.createDocument() to delegate to the Go file-service-go.'
    );
  }

  beforeUpdate(_event: UpdateEvent<Document>): void {
    throw new Error(
      'Direct UPDATE to document table is forbidden. Use FileServiceAdapter.updateDocument() to delegate to the Go file-service-go.'
    );
  }

  beforeRemove(_event: RemoveEvent<Document>): void {
    throw new Error(
      'Direct DELETE from document table is forbidden. Use FileServiceAdapter.deleteDocument() to delegate to the Go file-service-go.'
    );
  }
}
