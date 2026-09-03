import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class InvitationLoaderCreator implements DataLoaderCreator<IInvitation> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<IInvitation | null | EntityNotFoundException> {
    return createBatchLoader(this.invitationInBatch, {
      name: this.constructor.name,
      loadedTypeName: Invitation.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private invitationInBatch = (
    keys: ReadonlyArray<string>
  ): Promise<Invitation[]> => {
    return this.manager.findBy(Invitation, { id: In(keys) });
  };
}
