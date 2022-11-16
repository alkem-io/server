import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { FileManagerService } from './file.manager.service';
import { FileManagerResolverMutations } from './file.manager.resolver.mutations';

@Module({
  imports: [AuthorizationPolicyModule, AuthorizationModule, IpfsModule],
  providers: [FileManagerResolverMutations, FileManagerService],
  exports: [FileManagerService],
})
export class FileManagerModule {}
