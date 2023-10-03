import { CreateStorageBucketInput } from './storage.bucket.dto.create';
import { IStorageBucket } from '../storage.bucket.interface';

export class CreateChildStorageBucketInput extends CreateStorageBucketInput {
  parentStorageBucket!: IStorageBucket;
}
