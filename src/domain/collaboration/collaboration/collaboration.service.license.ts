import { LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseEntitlementNotAvailableException } from '@common/exceptions/license.entitlement.not.available.exception';
import { LicenseEntitlementUnevaluableException } from '@common/exceptions/license.entitlement.unevaluable.exception';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

const OFFICE_DOCS_USER_FACING_MESSAGE =
  'Office Docs is not enabled for this Collaboration.';
const LOG_ID_ALLOWED = 'office-docs-entitlement-allowed';
const LOG_ID_ABSENT = 'office-docs-entitlement-absent';
const LOG_ID_UNEVALUABLE = 'office-docs-entitlement-unevaluable';

@Injectable()
export class CollaborationLicenseService {
  constructor(
    private licenseService: LicenseService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    collaborationID: string,
    parentLicense: ILicense
  ): Promise<ILicense[]> {
    const collaborationEntity = await this.collaborationRepository.findOne({
      where: { id: collaborationID },
      relations: {
        license: {
          entitlements: true,
        },
      },
    });
    if (!collaborationEntity) {
      throw new EntityNotFoundException(
        'Collaboration not found at start of license reset',
        LogContext.LICENSE,
        { collaborationId: collaborationID }
      );
    }
    const collaboration: ICollaboration = collaborationEntity;
    if (!collaboration.license || !collaboration.license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load Collaboration with entities at start of license reset: ${collaboration.id} `,
        LogContext.LICENSE
      );
    }
    const updatedLicenses: ILicense[] = [];

    // Ensure always applying from a clean state
    collaboration.license = this.licenseService.reset(collaboration.license);

    collaboration.license = await this.extendLicensePolicy(
      collaboration.license,
      parentLicense
    );

    updatedLicenses.push(collaboration.license);

    return updatedLicenses;
  }

  private async extendLicensePolicy(
    license: ILicense | undefined,
    parentLicense: ILicense
  ): Promise<ILicense> {
    if (
      !license ||
      !license.entitlements ||
      !parentLicense ||
      !parentLicense.entitlements
    ) {
      throw new EntityNotInitializedException(
        'License or parent License with entitlements not found for RoleSet',
        LogContext.LICENSE
      );
    }
    const parentEntitlements = parentLicense.entitlements;
    for (const entitlement of license.entitlements) {
      switch (entitlement.type) {
        case LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE:
        case LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER:
        case LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER:
        case LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS:
          this.licenseService.findAndCopyParentEntitlement(
            entitlement,
            parentEntitlements
          );
          break;

        default:
          throw new EntityNotInitializedException(
            `Unknown entitlement type for Collaboration: ${entitlement.type}`,
            LogContext.LICENSE
          );
      }
    }

    return license;
  }

  /**
   * Office Docs entitlement gate (FR-001/FR-004/FR-009).
   * Resolves the Collaboration whose CalloutsSet matches the given ID and asserts the
   * SPACE_FLAG_OFFICE_DOCUMENTS entitlement is enabled. Fails-closed (FR-008) if the
   * Collaboration's license cannot be loaded.
   */
  public async ensureOfficeDocsAllowedForCalloutsSet(
    calloutsSetID: string
  ): Promise<void> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { calloutsSet: { id: calloutsSetID } },
      relations: { license: { entitlements: true } },
    });
    if (!collaboration) {
      // Not all CalloutsSets belong to a Collaboration (e.g. template CalloutsSets).
      // The gate only applies to Collaboration-owned CalloutsSets; allow others.
      return;
    }
    this.assertOfficeDocsAllowed(collaboration);
  }

  /**
   * Office Docs entitlement gate, resolved from a Callout ID (FR-001/FR-004/FR-006/FR-009).
   * Used by createContributionOnCallout and moveContributionToCallout (target callout).
   */
  public async ensureOfficeDocsAllowedForCallout(
    calloutID: string
  ): Promise<void> {
    const callout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      select: { id: true },
      relations: { calloutsSet: true },
    });
    if (!callout) {
      throw new EntityNotFoundException(
        `Callout not found while evaluating Office Docs entitlement`,
        LogContext.LICENSE,
        { calloutId: calloutID }
      );
    }
    if (!callout.calloutsSet) {
      // Defensive: a Callout without a CalloutsSet relation cannot be located in a
      // Collaboration; treat as unevaluable per FR-008.
      this.logger.error(LOG_ID_UNEVALUABLE, '', LogContext.LICENSE);
      throw new LicenseEntitlementUnevaluableException(
        OFFICE_DOCS_USER_FACING_MESSAGE,
        LogContext.LICENSE,
        { calloutId: calloutID }
      );
    }
    await this.ensureOfficeDocsAllowedForCalloutsSet(callout.calloutsSet.id);
  }

  /**
   * Office Docs entitlement gate, resolved directly from a Collaboration ID
   * (FR-001/FR-004/FR-005/FR-009). Used by template-apply pre-flight scan.
   */
  public async ensureOfficeDocsAllowedForCollaboration(
    collaborationID: string
  ): Promise<void> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id: collaborationID },
      relations: { license: { entitlements: true } },
    });
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Collaboration not found while evaluating Office Docs entitlement`,
        LogContext.LICENSE,
        { collaborationId: collaborationID }
      );
    }
    this.assertOfficeDocsAllowed(collaboration);
  }

  /**
   * Shared assertion: enforces FR-001 (block when absent), FR-008 (fail-closed when
   * unevaluable), and FR-010 (decision-point logging at the correct level).
   */
  private assertOfficeDocsAllowed(collaboration: ICollaboration): void {
    const collaborationId = collaboration.id;
    if (!collaboration.license || !collaboration.license.entitlements) {
      this.logger.error(LOG_ID_UNEVALUABLE, '', LogContext.LICENSE);
      throw new LicenseEntitlementUnevaluableException(
        OFFICE_DOCS_USER_FACING_MESSAGE,
        LogContext.LICENSE,
        { collaborationId }
      );
    }
    const enabled = this.licenseService.isEntitlementEnabled(
      collaboration.license,
      LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS
    );
    if (!enabled) {
      this.logger.warn(LOG_ID_ABSENT, LogContext.LICENSE);
      throw new LicenseEntitlementNotAvailableException(
        OFFICE_DOCS_USER_FACING_MESSAGE,
        LogContext.LICENSE,
        { collaborationId }
      );
    }
    this.logger.verbose?.(LOG_ID_ALLOWED, LogContext.LICENSE);
  }
}
