import { isEqual, uniq, uniqWith } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

const replacements: { [key: string]: string } = {
  HOME_0: 'HOME',
  HOME_1: 'HOME',
  HOME_2: 'HOME',
  HOME_LEFT: 'HOME',
  HOME_RIGHT: 'HOME',
  CONTRIBUTE_0: 'CONTRIBUTE',
  CONTRIBUTE_1: 'CONTRIBUTE',
  CONTRIBUTE_2: 'CONTRIBUTE',
  CONTRIBUTE_LEFT: 'CONTRIBUTE',
  CONTRIBUTE_RIGHT: 'CONTRIBUTE',
  COMMUNITY_0: 'COMMUNITY',
  COMMUNITY_1: 'COMMUNITY',
  COMMUNITY_2: 'COMMUNITY',
  COMMUNITY_LEFT: 'COMMUNITY',
  COMMUNITY_RIGHT: 'COMMUNITY',
  SUBSPACES_0: 'SUBSPACES',
  SUBSPACES_1: 'SUBSPACES',
  SUBSPACES_2: 'SUBSPACES',
  SUBSPACES_LEFT: 'SUBSPACES',
  SUBSPACES_RIGHT: 'SUBSPACES',
};

interface TagsetTemplate {
  id: string;
  allowedValues: string;
  defaultSelectedValue: string;
}

const replaceAllowedValues = (allowedValues: string): string => {
  const currentAllowedValues = allowedValues.split(',');
  const newAllowedValues = currentAllowedValues.map(value => {
    if (replacements[value]) {
      return replacements[value];
    }
    return value;
  });
  return uniq(newAllowedValues).join(',');
};

const replaceDefaultSelectedValue = (defaultSelectedValue: string): string => {
  if (replacements[defaultSelectedValue]) {
    return replacements[defaultSelectedValue];
  }
  return defaultSelectedValue;
};

interface Collaboration {
  id: string;
  groupsStr: string;
}

interface CalloutGroup {
  displayName: string;
  description: string;
}

const replaceGroupsStr = (groupsStr: string): string => {
  const elements: CalloutGroup[] = JSON.parse(groupsStr);
  const newElements = uniqWith(
    elements.map(element => {
      const newElement = { ...element };
      if (replacements[element.displayName]) {
        newElement.displayName = replacements[element.displayName];
        newElement.description = element.description.replace(
          /(left|right) column on the /,
          ''
        );
      }
      return newElement;
    }),
    (a, b) => a.displayName === b.displayName
  );
  return JSON.stringify(newElements);
};

export class allCalloutsInRightColumn1713264430226
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tagset:
    for (let key in replacements) {
      let value = replacements[key];
      await queryRunner.query(
        `UPDATE tagset SET tags = '${value}' WHERE name = 'callout-group' AND tags = '${key}';`
      );
    }

    // TagsetTemplate:
    const tagsetTemplates: TagsetTemplate[] = await queryRunner.query(
      `SELECT id, allowedValues, defaultSelectedValue FROM tagset_template WHERE name = 'callout-group';`
    );
    for (let tagsetTemplate of tagsetTemplates) {
      const newAllowedValues = replaceAllowedValues(
        tagsetTemplate.allowedValues
      );
      const newDefaultSelectedValue = replaceDefaultSelectedValue(
        tagsetTemplate.defaultSelectedValue
      );

      if (
        newAllowedValues !== tagsetTemplate.allowedValues ||
        newDefaultSelectedValue !== tagsetTemplate.defaultSelectedValue
      ) {
        await queryRunner.query(
          `UPDATE tagset_template SET allowedValues = '${newAllowedValues}', defaultSelectedValue='${newDefaultSelectedValue}' WHERE id = '${tagsetTemplate.id}';`
        );
      }
    }

    // Collaboration:
    const collaborations: Collaboration[] = await queryRunner.query(
      `SELECT id, groupsStr FROM collaboration;`
    );
    for (let collaboration of collaborations) {
      const newGroupsStr = replaceGroupsStr(collaboration.groupsStr);

      if (newGroupsStr !== collaboration.groupsStr) {
        await queryRunner.query(
          `UPDATE collaboration SET groupsStr = '${newGroupsStr}' WHERE id = '${collaboration.id}';`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
