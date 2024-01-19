import { StorageServiceType } from './storage.service.type';

export interface StorageService {
  getType(): StorageServiceType;
  save(data: Buffer): Promise<string> | never;
  read(fileName: string): Promise<Buffer> | never;
  delete(fileName: string): Promise<void> | never;
}
