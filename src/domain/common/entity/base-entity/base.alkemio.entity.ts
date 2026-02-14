/**
 * Base entity class for all Alkemio entities.
 * Provides common fields (id, dates, version) and a static create() factory.
 * Formerly extended TypeORM BaseEntity; now a plain TypeScript class.
 */
export abstract class BaseAlkemioEntity {
  id!: string;
  createdDate!: Date;
  updatedDate!: Date;
  version?: number;

  /**
   * Factory method that creates a new instance and assigns properties.
   * Replaces TypeORM's BaseEntity.create() with the same semantics.
   */
  static create<T extends BaseAlkemioEntity>(
    this: new () => T,
    data?: Partial<T>
  ): T {
    const instance = new this();
    if (data) {
      Object.assign(instance, data);
    }
    return instance;
  }
}
