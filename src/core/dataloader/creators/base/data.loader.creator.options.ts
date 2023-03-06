export interface DataLoaderCreatorOptions {
  /***
   * Which fields to select when executing the batch function.
   * Selects all fields by default
   */
  // todo make mandatory later
  fields?: Array<string>;
  /***
   * How many records to retrieve.
   * Retrieves all records by default
   */
  limit?: number;
  /***
   * Should the returned records by shuffled (randomized).
   * False by default
   */
  shuffle?: boolean;
}
