// typeorm FindOptionsSelect
export type DeepSelectProperty<Property> =
  Property extends Promise<infer I>
    ? DeepSelectProperty<I> | boolean
    : Property extends Array<infer I>
      ? DeepSelectProperty<I> | boolean
      : Property extends string
        ? boolean
        : Property extends number
          ? boolean
          : Property extends boolean
            ? boolean
            : Property extends Function
              ? never
              : Property extends Buffer
                ? boolean
                : Property extends Date
                  ? boolean
                  : Property extends object
                    ? DeepSelectProperties<Property>
                    : boolean;

export type DeepSelectProperties<Entity> = {
  [P in keyof Entity]?: P extends 'toString'
    ? unknown
    : DeepSelectProperty<NonNullable<Entity[P]>>;
};
