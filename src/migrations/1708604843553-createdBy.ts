import { MigrationInterface, QueryRunner } from 'typeorm';

export class createdBy1708604843553 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // CREATED BY
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD UNIQUE INDEX \`IDX_3d196d93816b91fdbec87363e9\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_3d196d93816b91fdbec87363e9\` ON \`discussion\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_3d196d93816b91fdbec87363e99\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD UNIQUE INDEX \`IDX_82cb26926bb13032087af2b116\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_82cb26926bb13032087af2b116\` ON \`invitation\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation\` ADD CONSTRAINT \`FK_82cb26926bb13032087af2b116a\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD UNIQUE INDEX \`IDX_ad65b2c0423314a193dd019de1\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ad65b2c0423314a193dd019de1\` ON \`invitation_external\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`invitation_external\` ADD CONSTRAINT \`FK_ad65b2c0423314a193dd019de18\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`document\` ADD UNIQUE INDEX \`IDX_a581782d3fe36e6cb98e40b057\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a581782d3fe36e6cb98e40b057\` ON \`document\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    // foreign key already exists - FK_3337f26ca267009fcf514e0e726

    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD UNIQUE INDEX \`IDX_655eca3595b132e412abe527e8\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_655eca3595b132e412abe527e8\` ON \`whiteboard\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_655eca3595b132e412abe527e8c\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`whiteboard_rt\` ADD UNIQUE INDEX \`IDX_93754d87bcb9acafb8b84d63b3\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_93754d87bcb9acafb8b84d63b3\` ON \`whiteboard_rt\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_rt\` ADD CONSTRAINT \`FK_93754d87bcb9acafb8b84d63b3c\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`post\` ADD UNIQUE INDEX \`IDX_43ae5b59527654c45cc0355324\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_43ae5b59527654c45cc0355324\` ON \`post\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_43ae5b59527654c45cc0355324c\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD UNIQUE INDEX \`IDX_f09c22f8f0f52a6744dfedc0b5\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_f09c22f8f0f52a6744dfedc0b5\` ON \`callout_contribution\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_f09c22f8f0f52a6744dfedc0b5c\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_ae73f8cd48086a99e15ff0be2e\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ae73f8cd48086a99e15ff0be2e\` ON \`callout\` (\`createdBy\`)` //toDo - discuss this. I don't believe it is needed
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_ae73f8cd48086a99e15ff0be2e3\` FOREIGN KEY (\`createdBy\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    //foreign key already exists - FK_6a30f26ca267009fcf514e0e726
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
