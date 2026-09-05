import { MemoModule } from '@domain/common/memo/memo.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ContentSigningModule } from './content.signing.module';

describe('ContentSigningModule wiring', () => {
  it.each([
    MemoModule,
    StorageBucketModule,
  ])('%s imports the one shared persistence module', moduleType => {
    const imports = Reflect.getMetadata('imports', moduleType);
    expect(imports).toContain(ContentSigningModule);
  });
});
