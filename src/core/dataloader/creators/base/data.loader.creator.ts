import { ILoader } from '../../loader.interface';
import { DataLoaderCreatorOptions } from './data.loader.creator.options';
import { Type } from '@nestjs/common';

export interface DataLoaderCreator<TReturn> {
  create(options?: DataLoaderCreatorOptions<TReturn>): ILoader<TReturn>;
}

export type ParentClassOption<T> = {
  /***
   * Specify to which parent entity would you have to join the relation
   * in order to return the result.
   * Useful in the where an entity like BaseChallenge is used for inheritance
   * but it's not a TypeORM entity and you can pass the appropriate entity here and
   * reduce the boilerplate
   */
  parentClassRef?: Type<T>;
};

export type DataLoaderCreatorWithParentOptions<TParent, TReturn> =
  DataLoaderCreatorOptions<TReturn> & ParentClassOption<TParent>;

export interface DataLoaderCreatorWithParent<TParent, TReturn> {
  create(
    options?: DataLoaderCreatorWithParentOptions<TParent, TReturn>
  ): ILoader<TReturn>;
}
