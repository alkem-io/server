import { isEqual } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

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
const READ_ONLY = true;

type Identifiable = { id: string };

type InnovationFlow = Identifiable & {
  states: {
    displayName: string;
    description: string;
  }[];
  settings: {
    minimumNumberOfStates: number;
    maximumNumberOfStates: number;
  };
  currentState: { displayName: string; description: string };
  flowStatesTagsetTemplateId: string;
  tagsetTemplate: TagsetTemplate;
};

type TagsetTemplate = Identifiable & {
  name: string;
  type: string;
  allowedValues: string;
  defaultSelectedValue: string;
  tagsetTemplateSetId: string;
};

type Collaboration = Identifiable & {
  calloutsSetId: string;
  isTemplate: boolean;
  innovationFlowId: string;
  innovationFlow: InnovationFlow;
};

type KnowledgeBase = Identifiable & {
  calloutsSetId: string;
  profileId: string;
};

type CalloutsSet = Identifiable & {
  type: string;
  tagsetTemplateSetId: string;
};

type Callout = Identifiable & {
  nameID: string;
  sortOrder: number;
  isTemplate: boolean;
  classificationId: string;
};

type ClassificationTagset = Identifiable & {
  name: string;
  tags: string;
  profileId: string;
  tagsetTemplateId: string;
  type: string;
  classificationId: string;
};

type ProblemsArrays = {
  solvedProblems: string[];
  ignoredProblems: string[];
  problems: string[];
};

abstract class Utils {
  public static hasDuplicates(array: any[]): boolean {
    const uniqueElements = new Set();
    for (const element of array) {
      if (uniqueElements.has(element)) {
        return true;
      }
      uniqueElements.add(element);
    }
    return false;
  }
}

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
        (min: ${innovationFlow.settings.minimumNumberOfStates}, max: ${innovationFlow.settings.maximumNumberOfStates})`);
    }
    if (!innovationFlow.currentState) {
      await this.solveInnovationFlowWithoutCurrentState(innovationFlow);
    }
    if (
      Utils.hasDuplicates(innovationFlow.states.map(state => state.displayName))
    ) {
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

  private solveTagsetTemplateWithInvalidAllowedValues = async (
    tagsetTemplate: TagsetTemplate,
    innovationFlow: InnovationFlow
  ) => {
    tagsetTemplate.allowedValues = innovationFlow.states
      .map(state => state.displayName)
      .join(',');
    this.writeQueryRunner.query(
      `UPDATE tagset_template SET allowedValues = ? WHERE id = '${tagsetTemplate.id}'`,
      [tagsetTemplate.allowedValues]
    );
    this.logSolvedProblem(
      `TagsetTemplate with id ${tagsetTemplate.id} had invalid allowedValues`
    );
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

class ClassificationTagsetProblems extends ProblemSolver {
  public checkClassificationTagset = async (
    classificationTagset: ClassificationTagset
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
  };
}

class CalloutProblems extends ProblemSolver {
  public getCalloutOfCollaboration = async (
    calloutId: string,
    calloutsSet: CalloutsSet,
    collaboration: Collaboration
  ): Promise<Callout> => {
    const callout: Callout = await this.readQueryRunner.query(`
      SELECT
        callout.id AS id,
        callout.nameID AS nameID,
        callout.sortOrder AS sortOrder,
        callout.isTemplate AS isTemplate,
        classification.id AS classificationId
      FROM callout
        LEFT JOIN classification ON classification.id = callout.classificationId
        WHERE calloutsSetId = '${calloutId}'
    `);

    const classificationTagsets: ClassificationTagset[] = await this
      .readQueryRunner.query(`
      SELECT id, name, tags, profileId, tagsetTemplateId, type, classificationId FROM tagset WHERE classificationId = '${callout.classificationId}'
    `);
    if (!callout.classificationId || classificationTagsets.length === 0) {
      throw new Error(
        `Callout ${callout.id} has no classificationId or tagset`
      );
    } else if (classificationTagsets.length > 1) {
      throw new Error(
        `Callout ${callout.id} has multiple classification tagsets`
      );
    } else {
      // Just one classification tagset, let's see if it's correct:
    }
  };
}

class CalloutsSetProblems extends ProblemSolver {
  public getCalloutsSets = async (): Promise<CalloutsSet[]> => {
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
    for (const callout of calloutsIds) {
      await new CalloutProblems(
        this.readQueryRunner,
        this.problemsArrays
      ).getCallout(callout.id, calloutsSet, collaboration);
    }
  };
}

export class DataCoherency1742475072830 implements MigrationInterface {
  private problemsArrays: ProblemsArrays = {
    solvedProblems: [],
    ignoredProblems: [],
    problems: [],
  };

  protected logProblem(problem: string) {
    this.problemsArrays.problems.push(problem);
  }
  protected logSolvedProblem(problem: string) {
    this.problemsArrays.solvedProblems.push(problem);
  }
  protected logIgnoredProblem(problem: string) {
    this.problemsArrays.ignoredProblems.push(problem);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const problemsSolver = new CalloutsSetProblems(
      queryRunner,
      this.problemsArrays
    );
    const calloutsSets: CalloutsSet[] = await problemsSolver.getCalloutsSets();
    for (const calloutsSet of calloutsSets) {
      if (calloutsSet.type === 'collaboration') {
        const collaboration = await new CollaborationProblems(
          queryRunner,
          this.problemsArrays
        ).getCollaborationForCalloutsSet(calloutsSet);
        problemsSolver.processCollaborationCallouts(calloutsSet, collaboration);
      } else if (calloutsSet.type === 'knowledge-base') {
        const knowledgeBase = await new KnowledgeBaseProblems(
          queryRunner,
          this.problemsArrays
        ).getKnowledgeBaseForCalloutSet(calloutsSet);
        //!! problemsSolver.processKnowledgeBaseCallouts(calloutsSet, collaboration);
      }
    }

    console.log('ignored', this.problemsArrays.ignoredProblems);
    console.log('solved', this.problemsArrays.solvedProblems);
    this.logProblem('This migration is not complete');

    if (this.problemsArrays.problems.length > 0) {
      this.problemsArrays.problems.forEach(console.log);
      throw new Error('Data coherency issues found');
    } else {
      console.log('No data coherency issues found');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration supported');
  }
}
