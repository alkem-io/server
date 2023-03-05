export class DataLoaderNotProvided extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataLoaderNotProvided';
  }
}
