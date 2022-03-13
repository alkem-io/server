import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IClaim } from './claim.interface';

@Injectable()
export class ClaimService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  createClaimObject(claims: IClaim[]) {
    let claimObject: Record<string, any> = {};

    for (const claim of claims) {
      claimObject = {
        ...claimObject,
        ...claim.asClaimObject(),
      };
    }

    return claimObject;
  }
}
