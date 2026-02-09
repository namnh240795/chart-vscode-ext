/**
 * Main diagram validator orchestrator
 * Coordinates all validation levels for .cryml files
 */

import * as yaml from 'yaml';
import { DiagramType } from '../types/diagrams';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  createError,
  aggregateResults,
  ErrorCode,
} from './types';
import {
  validateERDStructure,
} from './structureValidator';
import {
  validateERDReferences,
} from './referenceValidator';
import {
  validateERDLayout,
} from './layoutValidator';
import {
  validateERDBestPractices,
} from './bestPracticesValidator';

export class DiagramValidator {
  /**
   * Validate a .cryml file content
   * @param yamlContent The YAML file content as a string
   * @returns ValidationResult with errors, warnings, and validity status
   */
  async validate(yamlContent: string): Promise<ValidationResult> {
    try {
      // Parse YAML
      const parsed = yaml.parse(yamlContent);

      if (!parsed || typeof parsed !== 'object') {
        return {
          isValid: false,
          errors: [createError('MISSING_METADATA', '', 'YAML is empty or invalid')],
          warnings: [],
          diagramType: 'erd',
        };
      }

      // Detect diagram type
      const diagramType = this.detectDiagramType(parsed);

      // Phase 1: Structure validation (required fields, data types)
      const structureErrors = await this.validateStructure(parsed, diagramType);

      // If there are structure errors, skip further validation
      if (structureErrors.length > 0) {
        return aggregateResults(structureErrors, [], diagramType);
      }

      // Phase 2: Reference validation (FKs, participant IDs, node IDs)
      const referenceErrors = await this.validateReferences(parsed, diagramType);

      // Phase 3: Layout validation (circular deps, reachability, ordering)
      const layoutErrors = await this.validateLayout(parsed, diagramType);

      // Phase 4: Best practices warnings
      const warnings = await this.validateBestPractices(parsed, diagramType);

      // Aggregate all results
      const allErrors = [...structureErrors, ...referenceErrors, ...layoutErrors];

      return aggregateResults(allErrors, warnings, diagramType);
    } catch (error) {
      // YAML parsing error
      return {
        isValid: false,
        errors: [
          {
            level: 'error',
            code: 'MISSING_METADATA' as ErrorCode,
            message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
            path: '',
            suggestion: 'Check YAML syntax for errors',
          },
        ],
        warnings: [],
        diagramType: 'erd',
      };
    }
  }

  /**
   * Detect the diagram type from parsed YAML
   */
  private detectDiagramType(parsed: any): DiagramType {
    const diagramType = parsed.diagram_type;

    if (!diagramType) {
      // Default to ERD for backward compatibility
      return 'erd';
    }

    const validTypes: DiagramType[] = ['erd'];

    if (!validTypes.includes(diagramType)) {
      throw new Error(`Invalid diagram_type: ${diagramType}. Only 'erd' is supported.`);
    }

    return diagramType as DiagramType;
  }

  /**
   * Validate structure (required fields, data types, enum values)
   */
  private async validateStructure(
    parsed: any,
    diagramType: DiagramType
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Common structure validation
    if (!parsed.diagram_type) {
      // No error - default to ERD for backward compatibility
    } else if (!['erd'].includes(parsed.diagram_type)) {
      errors.push(createError('INVALID_DIAGRAM_TYPE', 'diagram_type'));
    }

    if (!parsed.metadata) {
      errors.push(createError('MISSING_METADATA', ''));
    } else if (!parsed.metadata.name) {
      errors.push(createError('MISSING_METADATA_NAME', 'metadata.name'));
    }

    // Type-specific structure validation
    if (diagramType === 'erd') {
      errors.push(...validateERDStructure(parsed));
    }

    return errors;
  }

  /**
   * Validate references (FKs exist, participant IDs valid, node IDs valid)
   */
  private async validateReferences(
    parsed: any,
    diagramType: DiagramType
  ): Promise<ValidationError[]> {
    if (diagramType === 'erd') {
      return validateERDReferences(parsed);
    }

    return [];
  }

  /**
   * Validate layout (no circular deps, sequential ordering, reachable nodes)
   */
  private async validateLayout(
    parsed: any,
    diagramType: DiagramType
  ): Promise<ValidationError[]> {
    if (diagramType === 'erd') {
      return validateERDLayout(parsed);
    }

    return [];
  }

  /**
   * Validate best practices (warnings for common issues)
   */
  private async validateBestPractices(
    parsed: any,
    diagramType: DiagramType
  ): Promise<ValidationWarning[]> {
    if (diagramType === 'erd') {
      return validateERDBestPractices(parsed);
    }

    return [];
  }
}
