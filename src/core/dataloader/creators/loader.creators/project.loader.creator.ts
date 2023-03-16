import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { IProject } from '@domain/collaboration/project';

@Injectable()
export class ProjectLoaderCreator implements DataLoaderCreator<IProject[]> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options?: DataLoaderCreatorOptions<IProject[]>) {
    return null as any;
  }

  // create(options?: DataLoaderCreatorOptions<IProject[]>) {
  //   return new DataLoader<string, IProject[]>(async keys => {
  //     const results = await this.manager.find(IProject, {
  //       select: selectOptionsFromFields<IProject>(options?.fields),
  //       // take: options?.limit,
  //     });
  //
  //     const resultsById = new Map<string, IProject[]>(
  //       results.map<[string, IProject[]]>(result => [
  //         result.id,
  //         result,
  //       ])
  //     );
  //     // ensure the result length matches the input length
  //     return ids.map(
  //       id =>
  //         resultsById.get(id) ??
  //           new EntityNotFoundException(
  //             `Could not load relation '${topLevelRelation}' for '${id}'`,
  //             LogContext.DATA_LOADER
  //           )
  //     );
  //   });
}
