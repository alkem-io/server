import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class applicationForm1676105002482 implements MigrationInterface {
  name = 'applicationForm1676105002482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create form table
    await queryRunner.query(
      `CREATE TABLE \`form\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                       \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                        \`version\` int NOT NULL,
                        \`description\` text NULL,
                        \`questions\` text NULL,
                          PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      'ALTER TABLE `community` ADD `applicationFormId` char(36) NULL'
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_25543901817dd09d5906537e088\` FOREIGN KEY (\`applicationFormId\`) REFERENCES \`form\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const communities: any[] = await queryRunner.query(
      `SELECT id, type from community`
    );
    for (const community of communities) {
      const applicationFormID = randomUUID();

      let applicationFormInput = hxbCommunityApplicationForm;
      if (community.type === 'Challenge') {
        applicationFormInput = challengeCommunityApplicationForm;
      } else if (community.type === 'Opportunity') {
        applicationFormInput = opportunityCommunityApplicationForm;
      }

      await queryRunner.query(
        `INSERT INTO form (id, createdDate, updatedDate, version, description, questions) VALUES ('${applicationFormID}', NOW(), NOW(), 1, '${
          applicationFormInput.description
        }', '${JSON.stringify(applicationFormInput.questions)}')`
      );
      await queryRunner.query(
        `UPDATE community SET applicationFormId = '${applicationFormID}' WHERE (id = '${community.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_25543901817dd09d5906537e088\``
    );
    await queryRunner.query('DROP TABLE `form`');

    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `applicationFormId`'
    );
  }
}

const hxbCommunityApplicationForm: any = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
    {
      question: 'Any particular role or contribution that you have in mind?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 2,
    },
    {
      question:
        'Through which user,organization or medium have you become acquainted with this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 3,
    },
    {
      question: 'Anything fun you want to tell us about yourself?!',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 4,
    },
    {
      question:
        'Do you already want to join a Challenge? If so, please provide the name(s).',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 5,
    },
  ],
};

const challengeCommunityApplicationForm: any = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join this Challenge?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
    {
      question: 'Any particular role or contribution that you have in mind?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 2,
    },
    {
      question:
        'Through which user,organization or medium have you become acquainted with this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 3,
    },
    {
      question: 'Anything fun you want to tell us about yourself?!',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 4,
    },
  ],
};

const opportunityCommunityApplicationForm: any = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join this Opportunity?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
    {
      question: 'Any particular role or contribution that you have in mind?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 2,
    },
    {
      question:
        'Through which user,organization or medium have you become acquainted with this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 3,
    },
    {
      question: 'Anything fun you want to tell us about yourself?!',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 4,
    },
  ],
};
