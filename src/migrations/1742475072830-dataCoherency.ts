import { isEqual } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  type Identifiable,
  type InnovationFlow,
  type TagsetTemplate,
  type Collaboration,
  type KnowledgeBase,
  type CalloutsSet,
  type ClassificationTagset,
  type Callout,
  hasDuplicates,
  equalClassificationTagsets,
  createSequence,
} from './utils/dataCoherency-utils';

/**
 * Loops over all the callouts_set and checks the following:
 *
 *
 * It checks for consistency in the data and calls the problem solving classes to fix the issues.
 * Can run in READ_ONLY mode changing the constant READ_ONLY to true.
 * There are some problems that are just logged and ignored, saved in the ignoredProblems array.
 * There are critical problems that throw an exception, with the ACC database is not throwing any exceptions.
 */

// Set to true to run in read-only mode

/* // Pending:
- check if there are classifications without callout
- check if there are callouts without calloutSet (integrity?)
- CalloutsSets: of collaborations, of knowledge-bases check if there are calloutsSets without parents
*/

const READ_ONLY = false;
const ROLLBACK_IF_UNKNOWN_PROBLEMS = true;

type ProblemsArrays = {
  solvedProblems: string[];
  ignoredProblems: string[];
  problems: string[];
};

abstract class ProblemSolver {
  protected readQueryRunner: QueryRunner;
  protected writeQueryRunner: QueryRunner;
  protected problemsArrays: ProblemsArrays;

  constructor(queryRunner: QueryRunner, problemsArrays: ProblemsArrays) {
    this.readQueryRunner = queryRunner;
    this.problemsArrays = problemsArrays;

    // If we are in read-only mode, mock the queryRunner
    if (READ_ONLY) {
      this.writeQueryRunner = {
        query: (query: string, parameters?: any[]) => {
          console.log(`Query: ${query}`, parameters);
          return Promise.resolve();
        },
      } as QueryRunner;
    } else {
      this.writeQueryRunner = queryRunner;
    }
  }

  protected logProblem(problem: string) {
    this.problemsArrays.problems.push(problem);
  }
  protected logSolvedProblem(problem: string) {
    this.problemsArrays.solvedProblems.push(problem);
  }
  protected logIgnoredProblem(problem: string) {
    this.problemsArrays.ignoredProblems.push(problem);
  }
}

class InnovationFlowProblems extends ProblemSolver {
  public getInnovationFlow = async (
    innovationFlowId: string
  ): Promise<InnovationFlow> => {
    const [innovationFlow]: InnovationFlow[] = await this.readQueryRunner
      .query(`
      SELECT id, states, settings, currentState, flowStatesTagsetTemplateId FROM innovation_flow WHERE id = '${innovationFlowId}'
    `);
    if (!innovationFlow) {
      throw new Error(`InnovationFlow with id ${innovationFlowId} not found`);
    }
    if (!innovationFlow.states) {
      throw new Error(
        `InnovationFlow with id ${innovationFlowId} has no states`
      );
    }
    if (!innovationFlow.settings) {
      await this.solveInnovationFlowWithoutSettings(innovationFlow);
    }
    if (innovationFlow.states.length === 0) {
      throw new Error(
        `InnovationFlow with id ${innovationFlowId} has no states`
      );
    }
    if (
      innovationFlow.states.length <
        innovationFlow.settings.minimumNumberOfStates ||
      innovationFlow.states.length >
        innovationFlow.settings.maximumNumberOfStates
    ) {
      this
        .logIgnoredProblem(`InnovationFlow with id ${innovationFlowId} has an invalid number of states: ${innovationFlow.states.length}
          (${innovationFlow.states.map(state => state.displayName)})
        (min: ${innovationFlow.settings.minimumNumberOfStates}, max: ${innovationFlow.settings.maximumNumberOfStates})`);
    }
    if (!innovationFlow.currentState) {
      await this.solveInnovationFlowWithoutCurrentState(innovationFlow);
    }
    if (hasDuplicates(innovationFlow.states.map(state => state.displayName))) {
      throw new Error(
        `InnovationFlow with id ${innovationFlowId} has duplicate state names ${innovationFlow.states.map(state => state.displayName)}`
      );
    }
    if (
      !innovationFlow.states.some(
        state => state.displayName === innovationFlow.currentState.displayName
      )
    ) {
      await this.solveInnovationFlowWithInvalidCurrentState(innovationFlow);
    }

    innovationFlow.tagsetTemplate = await new TagsetTemplateProblems(
      this.readQueryRunner,
      this.problemsArrays
    ).getTagsetTemplateOfInnovationFlow(innovationFlow);

    return innovationFlow;
  };

  private solveInnovationFlowWithoutSettings = async (
    innovationFlow: InnovationFlow
  ) => {
    innovationFlow.settings = {
      maximumNumberOfStates: 8,
      minimumNumberOfStates: 1,
    };
    await this.writeQueryRunner.query(
      `UPDATE innovation_flow SET settings = ? WHERE id = '${innovationFlow.id}'`,
      [JSON.stringify(innovationFlow.settings)]
    );
    this.logSolvedProblem(
      `InnovationFlow with id ${innovationFlow.id} had no settings`
    );
  };

  private solveInnovationFlowWithoutCurrentState = async (
    innovationFlow: InnovationFlow
  ) => {
    innovationFlow.currentState = innovationFlow.states[0];
    await this.writeQueryRunner.query(
      `UPDATE innovation_flow SET currentState = ? WHERE id = '${innovationFlow.id}'`,
      [JSON.stringify(innovationFlow.currentState)]
    );
    this.logSolvedProblem(
      `InnovationFlow with id ${innovationFlow.id} had no currentState`
    );
  };

  private solveInnovationFlowWithInvalidCurrentState = async (
    innovationFlow: InnovationFlow
  ) => {
    innovationFlow.currentState = innovationFlow.states[0];
    await this.writeQueryRunner.query(
      `UPDATE innovation_flow SET currentState = ? WHERE id = '${innovationFlow.id}'`,
      [JSON.stringify(innovationFlow.currentState)]
    );
    this.logSolvedProblem(
      `InnovationFlow with id ${innovationFlow.id} had an invalid currentState`
    );
  };
}

class TagsetTemplateProblems extends ProblemSolver {
  public getTagsetTemplateOfInnovationFlow = async (
    innovationFlow: InnovationFlow
  ): Promise<TagsetTemplate> => {
    const [tagsetTemplate]: TagsetTemplate[] = await this.readQueryRunner
      .query(`
      SELECT id, name, type, allowedValues, defaultSelectedValue, tagsetTemplateSetId FROM tagset_template WHERE id = '${innovationFlow.flowStatesTagsetTemplateId}'
    `);
    if (!tagsetTemplate) {
      throw new Error(
        `TagsetTemplate with id ${innovationFlow.flowStatesTagsetTemplateId} not found`
      );
    }
    if (tagsetTemplate.name !== 'flow-state') {
      throw new Error(
        `TagsetTemplate with id ${innovationFlow.flowStatesTagsetTemplateId} has name ${tagsetTemplate.name}`
      );
    }
    if (tagsetTemplate.type !== 'select-one') {
      throw new Error(
        `TagsetTemplate with id ${innovationFlow.flowStatesTagsetTemplateId} has type ${tagsetTemplate.type}`
      );
    }
    const allowedValues = tagsetTemplate.allowedValues.split(',');
    const states = innovationFlow.states.map(state => state.displayName);
    if (!isEqual(allowedValues.sort(), states.sort())) {
      if (states.join(',') !== tagsetTemplate.allowedValues) {
        await this.solveTagsetTemplateWithInvalidAllowedValues(
          tagsetTemplate,
          innovationFlow
        );
      } else {
        this.logIgnoredProblem(
          `InnovationFlow has states with commas in them: ${innovationFlow.id}`
        );
      }
    }
    if (!allowedValues.includes(tagsetTemplate.defaultSelectedValue)) {
      throw new Error(
        `TagsetTemplate with id ${innovationFlow.flowStatesTagsetTemplateId} has defaultSelectedValue ${tagsetTemplate.defaultSelectedValue} not in allowedValues`
      );
    }
    if (!tagsetTemplate.tagsetTemplateSetId) {
      throw new Error(
        `TagsetTemplate with id ${innovationFlow.flowStatesTagsetTemplateId} has no tagsetTemplateSetId`
      );
    }
    return tagsetTemplate;
  };

  public getTagsetTemplateOfTagSet = async (
    tagset: ClassificationTagset,
    callout: Callout,
    calloutsSet: CalloutsSet,
    collaboration: Collaboration
  ): Promise<TagsetTemplate> => {
    const [tagsetTemplate]: TagsetTemplate[] = await this.readQueryRunner
      .query(`
    SELECT id, name, type, allowedValues, defaultSelectedValue, tagsetTemplateSetId FROM tagset_template WHERE id = '${tagset.tagsetTemplateId}'
  `);
    if (!tagsetTemplate) {
      throw new Error(
        `TagsetTemplate with id ${tagset.tagsetTemplateId} not found`
      );
    }
    if (tagsetTemplate.name !== 'flow-state') {
      throw new Error(
        `TagsetTemplate with id ${tagset.tagsetTemplateId} has name ${tagsetTemplate.name}`
      );
    }
    if (tagsetTemplate.type !== 'select-one') {
      throw new Error(
        `TagsetTemplate with id ${tagset.tagsetTemplateId} has type ${tagsetTemplate.type}`
      );
    }
    const validFlowStates = collaboration.innovationFlow.states.map(
      state => state.displayName
    );
    if (
      !isEqual(
        tagsetTemplate.allowedValues.split(',').sort(),
        validFlowStates.sort()
      )
    ) {
      if (validFlowStates.join(',') !== tagsetTemplate.allowedValues) {
        await this.solveTagsetTemplateWithInvalidAllowedValues(
          tagsetTemplate,
          collaboration.innovationFlow
        );
      } else {
        this.logIgnoredProblem(
          `InnovationFlow has states with commas in them: ${collaboration.innovationFlow.id}`
        );
      }
    }
    if (
      !tagsetTemplate.allowedValues
        .split(',')
        .includes(tagsetTemplate.defaultSelectedValue)
    ) {
      this.solveTagsetTemplateWithInvalidDefaultSelectedValue(
        tagsetTemplate,
        validFlowStates[0]
      );
    }
    if (!tagsetTemplate.tagsetTemplateSetId) {
      throw new Error(
        `TagsetTemplate with id ${tagsetTemplate.id} has no tagsetTemplateSetId`
      );
    }
    if (
      tagsetTemplate.tagsetTemplateSetId !== calloutsSet.tagsetTemplateSetId
    ) {
      throw new Error(
        `TagsetTemplate with id ${tagsetTemplate.id} has tagsetTemplateSetId different than the calloutsSet`
      );
    }
    return tagsetTemplate;
  };

  private solveTagsetTemplateWithInvalidAllowedValues = async (
    tagsetTemplate: TagsetTemplate,
    innovationFlow: InnovationFlow
  ) => {
    const oldInvalid = tagsetTemplate.allowedValues;
    tagsetTemplate.allowedValues = innovationFlow.states
      .map(state => state.displayName)
      .join(',');
    this.writeQueryRunner.query(
      `UPDATE tagset_template SET allowedValues = ? WHERE id = '${tagsetTemplate.id}'`,
      [tagsetTemplate.allowedValues]
    );
    this.logSolvedProblem(
      `TagsetTemplate with id ${tagsetTemplate.id} had invalid allowedValues: ${oldInvalid} => ${tagsetTemplate.allowedValues}`
    );
  };
  private solveTagsetTemplateWithInvalidDefaultSelectedValue = async (
    tagsetTemplate: TagsetTemplate,
    newDefaultValue: string
  ) => {
    const oldInvalid = tagsetTemplate.defaultSelectedValue;
    tagsetTemplate.defaultSelectedValue = newDefaultValue;
    this.writeQueryRunner.query(
      `UPDATE tagset_template SET defaultSelectedValue = ? WHERE id = '${tagsetTemplate.id}'`,
      [tagsetTemplate.defaultSelectedValue]
    );
    this.logSolvedProblem(
      `TagsetTemplate with id ${tagsetTemplate.id} had invalid defaultSelectedValue: ${oldInvalid} => ${newDefaultValue} of ${tagsetTemplate.allowedValues}`
    );
  };
}

type ChooseClassificationResult =
  | {
      indexGoodOne: number;
      delete: number[];
    }
  | undefined;

class ClassificationTagsetProblems extends ProblemSolver {
  public checkClassificationTagset = async (
    classificationTagset: ClassificationTagset,
    callout: Callout,
    calloutsSet: CalloutsSet,
    collaboration: Collaboration
  ) => {
    if (classificationTagset.name !== 'flow-state') {
      this.logProblem(
        `ClassificationTagset ${classificationTagset.id} has a name different than 'flow-state'`
      );
    }
    if (classificationTagset.type !== 'select-one') {
      this.logProblem(
        `ClassificationTagset ${classificationTagset.id} has a type different than 'select-one'`
      );
    }
    if (classificationTagset.profileId) {
      this.logProblem(
        `ClassificationTagset ${classificationTagset.id} has a profileId`
      );
    }

    const validStates = collaboration.innovationFlow.states.map(
      state => state.displayName
    );
    const defaultState = collaboration.innovationFlow.currentState.displayName;
    const validStatesLower = validStates.map(state => state.toLowerCase());
    if (!validStates.includes(classificationTagset.tags)) {
      // The state is not perfectly valid
      const index = validStatesLower.indexOf(
        classificationTagset.tags.toLowerCase()
      );
      if (index !== -1) {
        this.setState(classificationTagset, validStates[index]);
        this.logSolvedProblem(
          `Callout ${callout.id} had a classification tagset with a state that was not perfectly valid: ${classificationTagset.tags}. Changed to ${validStates[index]}`
        );
        classificationTagset.tags = validStates[index];
      } else {
        this.setState(classificationTagset, defaultState);
        this.logSolvedProblem(
          `Callout ${callout.id} had a classification tagset with a state that was WRONG: ${classificationTagset.tags}. Changed to ${defaultState}`
        );
        classificationTagset.tags = defaultState;
      }
    }

    await new TagsetTemplateProblems(
      this.readQueryRunner,
      this.problemsArrays
    ).getTagsetTemplateOfTagSet(
      classificationTagset,
      callout,
      calloutsSet,
      collaboration
    );
  };

  private chooseClassificationTagset2 = (
    validStates: string[],
    tagsets: [ClassificationTagset, ClassificationTagset]
  ): ChooseClassificationResult => {
    if (
      validStates.includes(tagsets[0].tags) &&
      !validStates.includes(tagsets[1].tags)
    ) {
      return { indexGoodOne: 0, delete: [1] };
    } else if (
      validStates.includes(tagsets[1].tags) &&
      !validStates.includes(tagsets[0].tags)
    ) {
      return { indexGoodOne: 1, delete: [0] };
    } else {
      return undefined;
    }
  };

  private chooseClassificationTagset3 = (
    validStates: string[],
    tagsets: [ClassificationTagset, ClassificationTagset, ClassificationTagset]
  ): ChooseClassificationResult => {
    if (validStates.includes(tagsets[0].tags)) {
      return { indexGoodOne: 0, delete: [1, 2] };
    } else if (validStates.includes(tagsets[1].tags)) {
      return { indexGoodOne: 1, delete: [0, 2] };
    } else if (validStates.includes(tagsets[2].tags)) {
      return { indexGoodOne: 2, delete: [0, 1] };
    } else {
      return undefined;
    }
  };

  public handleMultipleClassificationTagsets = async (
    classificationTagsets: ClassificationTagset[],
    callout: Callout,
    collaboration: Collaboration
  ): Promise<ClassificationTagset> => {
    const validStates = collaboration.innovationFlow.states.map(
      state => state.displayName
    );
    const validStatesLower = validStates.map(state => state.toLowerCase());
    const classificationTagsetsLower = classificationTagsets.map(tagset => ({
      ...tagset,
      tags: tagset.tags.toLowerCase(),
    }));
    let result: ChooseClassificationResult | undefined;

    switch (classificationTagsets.length) {
      case 0:
      case 1:
        throw new Error(
          'This function should only be called with 2 classification tagsets or more'
        );
      case 2: {
        if (
          equalClassificationTagsets(
            classificationTagsets[0],
            classificationTagsets[1]
          )
        ) {
          this.logSolvedProblem(
            `Callout ${callout.id} had 2 classification tagsets with the same data. Second will be deleted`
          );
          result = { indexGoodOne: 0, delete: [1] };
          break;
        }
        result = this.chooseClassificationTagset2(
          validStates,
          classificationTagsets as [ClassificationTagset, ClassificationTagset]
        );
        if (!result) {
          result = this.chooseClassificationTagset2(
            validStatesLower,
            classificationTagsetsLower as [
              ClassificationTagset,
              ClassificationTagset,
            ]
          );
        }
        break;
      }
      case 3: {
        result = this.chooseClassificationTagset3(
          validStates,
          classificationTagsets as [
            ClassificationTagset,
            ClassificationTagset,
            ClassificationTagset,
          ]
        );
        if (!result) {
          result = this.chooseClassificationTagset3(
            validStatesLower,
            classificationTagsetsLower as [
              ClassificationTagset,
              ClassificationTagset,
              ClassificationTagset,
            ]
          );
        }
        break;
      }
      default:
        throw new Error(
          'This function should only be called with 2 or 3 classification tagsets'
        );
    }
    if (!result) {
      this.logSolvedProblem(
        `Callout ${callout.id} had ${classificationTagsets.length} classification tagsets. But none of them were valid, deleted all except ${classificationTagsets[0].id}`
      );
      result = {
        indexGoodOne: 0,
        delete: createSequence(classificationTagsets.length - 1),
      };
    }

    const deletedTagsets = [];
    for (const indexDelete of result.delete) {
      deletedTagsets.push(
        `${classificationTagsets[indexDelete].id}:${classificationTagsets[indexDelete].tags}`
      );
      await this.deleteTagset(classificationTagsets[indexDelete]);
    }
    this
      .logSolvedProblem(`Callout ${callout.id} had ${classificationTagsets.length} classification tagsets. valid states: [${validStates.join(', ')}]
      But the [${result.indexGoodOne}]:${classificationTagsets[result.indexGoodOne].id} was the selected to stay: ${classificationTagsets[result.indexGoodOne].tags}
      Rest deleted [${result.delete.join(',')}]:${deletedTagsets.join(', ')}`);

    return classificationTagsets[result.indexGoodOne];
  };

  public deleteTagset = async (tagset: Identifiable) => {
    const tagsetData: { id: string; authorizationId: string }[] =
      await this.readQueryRunner.query(
        `SELECT id, authorizationId FROM tagset WHERE id = '${tagset.id}'`
      );

    if (!tagsetData || tagsetData.length === 0) {
      this.logProblem(`Couldn't find tagset ${tagset.id}`); //!! this should be critical
      return;
    }
    const { authorizationId } = tagsetData[0];
    await this.writeQueryRunner.query(
      `DELETE FROM authorization_policy WHERE id = '${authorizationId}'`
    );
    await this.writeQueryRunner.query(
      `DELETE FROM tagset WHERE id = '${tagset.id}'`
    );
  };
  public setState = async (tagset: Identifiable, state: string) => {
    await this.writeQueryRunner.query(
      `UPDATE tagset SET tags = ? WHERE id = '${tagset.id}'`,
      [state]
    );
  };
}

class CalloutProblems extends ProblemSolver {
  public getCalloutOfCollaboration = async (
    calloutId: string,
    calloutsSet: CalloutsSet,
    collaboration: Collaboration
  ): Promise<Callout> => {
    const [callout]: Callout[] = await this.readQueryRunner.query(`
      SELECT
        callout.id,
        callout.nameID,
        callout.framingId,
        callout.sortOrder,
        callout.isTemplate,
        callout.classificationId
      FROM callout WHERE id = '${calloutId}'
    `);
    if (!callout) {
      throw new Error(`Callout with id ${calloutId} not found`);
    }
    const [classification] = await this.readQueryRunner.query(`
      SELECT id FROM classification WHERE id = '${callout.classificationId}'
    `);
    if (!classification) {
      throw new Error(`Callout ${callout.id} has no classification`);
    }

    const classificationTagsets: ClassificationTagset[] = await this
      .readQueryRunner.query(`
      SELECT id, name, tags, profileId, tagsetTemplateId, type, classificationId FROM tagset WHERE classificationId = '${callout.classificationId}'
    `);
    let theClassificationTagset: ClassificationTagset;
    if (!callout.classificationId || classificationTagsets.length === 0) {
      throw new Error(
        `Callout ${callout.id} has no classificationId or classification tagset`
      );
    } else if (classificationTagsets.length > 1) {
      theClassificationTagset = await new ClassificationTagsetProblems(
        this.readQueryRunner,
        this.problemsArrays
      ).handleMultipleClassificationTagsets(
        classificationTagsets,
        callout,
        collaboration
      );
    } else {
      theClassificationTagset = classificationTagsets[0];
    }
    await new ClassificationTagsetProblems(
      this.readQueryRunner,
      this.problemsArrays
    ).checkClassificationTagset(
      theClassificationTagset,
      callout,
      calloutsSet,
      collaboration
    );

    return callout;
  };

  public getCalloutOfKnowledge = async (
    calloutId: string,
    calloutsSet: CalloutsSet,
    knowledge: KnowledgeBase
  ): Promise<Callout> => {
    const [callout]: Callout[] = await this.readQueryRunner.query(`
      SELECT
        callout.id,
        callout.nameID,
        callout.framingId,
        callout.sortOrder,
        callout.isTemplate,
        callout.classificationId
      FROM callout WHERE id = '${calloutId}'
    `);
    if (!callout) {
      throw new Error(`Callout with id ${calloutId} in KB not found`);
    }
    const [classification] = await this.readQueryRunner.query(`
      SELECT id FROM classification WHERE id = '${callout.classificationId}'
    `);
    if (!classification) {
      throw new Error(`Callout ${callout.id} in KB has no classification`);
    }

    const classificationTagsets: ClassificationTagset[] = await this
      .readQueryRunner.query(`
      SELECT id, name, tags, profileId, tagsetTemplateId, type, classificationId FROM tagset WHERE classificationId = '${callout.classificationId}'
    `);
    // Knowledge bases shouldn't have any classification tagset:
    for (const tagset of classificationTagsets) {
      await new ClassificationTagsetProblems(
        this.readQueryRunner,
        this.problemsArrays
      ).deleteTagset(tagset);
      this.logSolvedProblem(
        `Callout ${callout.id} in KB had a classification tagset, deleted ${tagset.id}`
      );
    }

    return callout;
  };
}

class CollaborationProblems extends ProblemSolver {
  public getCollaborationForCalloutsSet = async (
    calloutsSet: CalloutsSet
  ): Promise<Collaboration> => {
    const collaborations: Collaboration[] = await this.readQueryRunner.query(`
      SELECT
        collaboration.id AS id,
        collaboration.calloutsSetId AS calloutsSetId,
        collaboration.isTemplate AS isTemplate,
        innovation_flow.id AS innovationFlowId
      FROM collaboration
        LEFT JOIN innovation_flow ON innovation_flow.id = collaboration.innovationFlowId
      WHERE calloutsSetId = '${calloutsSet.id}'
    `);
    if (collaborations.length !== 1) {
      throw new Error(
        `Collaboration with calloutsSetId ${calloutsSet.id} not found`
      );
    }
    const innovationFlow = await new InnovationFlowProblems(
      this.readQueryRunner,
      this.problemsArrays
    ).getInnovationFlow(collaborations[0].innovationFlowId);

    const collaboration = {
      ...collaborations[0],
      innovationFlow: innovationFlow,
    };

    if (
      collaboration.innovationFlow.tagsetTemplate.tagsetTemplateSetId !==
      calloutsSet.tagsetTemplateSetId
    ) {
      throw new Error(
        `Collaboration with calloutsSetId ${calloutsSet.id} has different tagsetTemplateSetId than the calloutsSet`
      );
    }
    return collaboration;
  };
}

class KnowledgeBaseProblems extends ProblemSolver {
  public getKnowledgeBaseForCalloutSet = async (
    calloutsSet: CalloutsSet
  ): Promise<KnowledgeBase> => {
    const knowledgeBases: KnowledgeBase[] = await this.readQueryRunner.query(`
      SELECT
        knowledge_base.id AS id,
        knowledge_base.calloutsSetId AS calloutsSetId,
        knowledge_base.profileId AS profileId
      FROM knowledge_base WHERE calloutsSetId = '${calloutsSet.id}'
    `);
    if (knowledgeBases.length !== 1) {
      throw new Error(
        `KnowledgeBase with calloutsSetId ${calloutsSet.id} not found`
      );
    }
    // Check anything in the profile //!!
    return knowledgeBases[0];
  };
}

class CalloutsSetProblems extends ProblemSolver {
  public getAllCalloutsSets = async (): Promise<CalloutsSet[]> => {
    const calloutsSets: CalloutsSet[] = await this.readQueryRunner.query(`
      SELECT id, type, tagsetTemplateSetId FROM callouts_set
    `);
    return calloutsSets;
  };

  public processCollaborationCallouts = async (
    calloutsSet: CalloutsSet,
    collaboration: Collaboration
  ) => {
    const calloutsIds: Identifiable[] = await this.readQueryRunner.query(`
      SELECT id FROM callout WHERE calloutsSetId = '${calloutsSet.id}'
    `);
    for (const { id: calloutId } of calloutsIds) {
      const callout = await new CalloutProblems(
        this.readQueryRunner,
        this.problemsArrays
      ).getCalloutOfCollaboration(calloutId, calloutsSet, collaboration);
    }
  };

  public processKnowledgeBaseCallouts = async (
    calloutsSet: CalloutsSet,
    knowledge: KnowledgeBase
  ) => {
    const calloutsIds: Identifiable[] = await this.readQueryRunner.query(`
      SELECT id FROM callout WHERE calloutsSetId = '${calloutsSet.id}'
    `);
    for (const { id: calloutId } of calloutsIds) {
      const callout = await new CalloutProblems(
        this.readQueryRunner,
        this.problemsArrays
      ).getCalloutOfKnowledge(calloutId, calloutsSet, knowledge);
    }
  };
}

export class DataCoherency1742475072830 implements MigrationInterface {
  private problemsArrays: ProblemsArrays = {
    solvedProblems: [],
    ignoredProblems: [],
    problems: [],
  };

  private printProblems(problems: string[], header?: string) {
    if (header) {
      console.log(header);
      console.log('='.repeat(header.length));
    }
    for (const problem of problems) {
      console.log(problem);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const problemsSolver = new CalloutsSetProblems(
      queryRunner,
      this.problemsArrays
    );
    const calloutsSets: CalloutsSet[] =
      await problemsSolver.getAllCalloutsSets();
    for (const calloutsSet of calloutsSets) {
      if (calloutsSet.type === 'collaboration') {
        const collaboration = await new CollaborationProblems(
          queryRunner,
          this.problemsArrays
        ).getCollaborationForCalloutsSet(calloutsSet);
        await problemsSolver.processCollaborationCallouts(
          calloutsSet,
          collaboration
        );
      } else if (calloutsSet.type === 'knowledge-base') {
        const knowledgeBase = await new KnowledgeBaseProblems(
          queryRunner,
          this.problemsArrays
        ).getKnowledgeBaseForCalloutSet(calloutsSet);
        await problemsSolver.processKnowledgeBaseCallouts(
          calloutsSet,
          knowledgeBase
        );
      } else {
        throw new Error(
          `CalloutsSet with id ${calloutsSet.id} has unknown type ${calloutsSet.type}`
        );
      }
    }

    this.printProblems(this.problemsArrays.ignoredProblems, 'IGNORED');
    this.printProblems(this.problemsArrays.solvedProblems, 'SOLVED');
    this.printProblems(this.problemsArrays.problems, 'REMAINING PROBLEMS');

    //this.problemsArrays.problems.push('This migration is not complete');
    if (this.problemsArrays.problems.length > 0) {
      console.log('REMAINING PROBLEMS', this.problemsArrays.problems);
      if (ROLLBACK_IF_UNKNOWN_PROBLEMS) {
        // throws an exception to rollback all the changes
        throw new Error('Unknown data coherency issues found, rolling back');
      }
    } else {
      console.log('Finished');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration supported');
  }
}
