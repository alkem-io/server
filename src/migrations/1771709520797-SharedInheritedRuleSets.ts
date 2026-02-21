import { MigrationInterface, QueryRunner } from "typeorm";

export class SharedInheritedRuleSets1771709520797 implements MigrationInterface {
    name = 'SharedInheritedRuleSets1771709520797'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inherited_credential_rule_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "credentialRules" jsonb NOT NULL, "parentAuthorizationPolicyId" character varying(36) NOT NULL, CONSTRAINT "UQ_dd36dd4daae9fbbef701b980e6b" UNIQUE ("parentAuthorizationPolicyId"), CONSTRAINT "PK_102104397c9526af7229a4e897a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "authorization_policy" ADD "inheritedCredentialRuleSetId" uuid`);
        await queryRunner.query(`ALTER TABLE "authorization_policy" ADD CONSTRAINT "FK_a70fc3c633a6bc83761d5477ec2" FOREIGN KEY ("inheritedCredentialRuleSetId") REFERENCES "inherited_credential_rule_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authorization_policy" DROP CONSTRAINT "FK_a70fc3c633a6bc83761d5477ec2"`);
        await queryRunner.query(`ALTER TABLE "authorization_policy" DROP COLUMN "inheritedCredentialRuleSetId"`);
        await queryRunner.query(`DROP TABLE "inherited_credential_rule_set"`);
    }

}
