export interface FilterStrategy<TData> {
  execute(data: TData[], filterValue: string): TData;
}
