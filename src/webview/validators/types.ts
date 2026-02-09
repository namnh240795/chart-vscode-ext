/**
 * Validation result types for diagram validation
 */

import { DiagramType } from '../types/diagrams';

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  diagramType: DiagramType;
}

// ============================================================================
// Validation Error
// ============================================================================

export interface ValidationError {
  level: 'error';
  code: ErrorCode;
  message: string;
  path: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

// ============================================================================
// Validation Warning
// ============================================================================

export interface ValidationWarning {
  level: 'warning';
  code: WarningCode;
  message: string;
  path: string;
  line?: number;
  suggestion?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

// Common error codes
export type ErrorCode =
  // Common
  | 'MISSING_DIAGRAM_TYPE'
  | 'INVALID_DIAGRAM_TYPE'
  | 'MISSING_METADATA'
  | 'MISSING_METADATA_NAME'
  // ERD
  | 'FK_TABLE_NOT_FOUND'
  | 'FK_COLUMN_NOT_FOUND'
  | 'CIRCULAR_DEPENDENCY'
  // Sequence
  | 'PARTICIPANT_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'INVALID_SEQUENCE_ORDER'
  | 'DUPLICATE_PARTICIPANT_ID'
  | 'DUPLICATE_MESSAGE_ID'
  | 'MISSING_BLOCK_CONDITION'
  // Flow
  | 'NODE_NOT_FOUND'
  | 'UNREACHABLE_NODE'
  | 'DUPLICATE_NODE_ID'
  | 'DUPLICATE_EDGE_ID'
  | 'MULTIPLE_START_NODES'
  | 'NO_START_NODE';

// ============================================================================
// Warning Codes
// ============================================================================

export type WarningCode =
  // ERD
  | 'MISSING_PRIMARY_KEY'
  | 'FK_WITHOUT_INDEX'
  // Sequence
  | 'UNUSED_PARTICIPANT'
  // Flow
  | 'DECISION_FEW_BRANCHES'
  | 'MISSING_CONDITION'
  | 'FORK_JOIN_MISMATCH'
  | 'COMPLEX_DIAGRAM';

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Common
  MISSING_DIAGRAM_TYPE: 'Missing required field: diagram_type',
  INVALID_DIAGRAM_TYPE: 'Invalid diagram_type. Must be one of: erd, sequence, flow',
  MISSING_METADATA: 'Missing required field: metadata',
  MISSING_METADATA_NAME: 'Missing required field: metadata.name',

  // ERD
  FK_TABLE_NOT_FOUND: 'Foreign key references non-existent table',
  FK_COLUMN_NOT_FOUND: 'Foreign key references non-existent column',
  CIRCULAR_DEPENDENCY: 'Circular foreign key dependency detected',

  // Sequence
  PARTICIPANT_NOT_FOUND: 'Message references non-existent participant',
  MESSAGE_NOT_FOUND: 'Block references non-existent message',
  INVALID_SEQUENCE_ORDER: 'sequence_order must be sequential starting from 1',
  DUPLICATE_PARTICIPANT_ID: 'Duplicate participant ID',
  DUPLICATE_MESSAGE_ID: 'Duplicate message ID',
  MISSING_BLOCK_CONDITION: 'Block type requires a condition',

  // Flow
  NODE_NOT_FOUND: 'Edge references non-existent node',
  UNREACHABLE_NODE: 'Node is not reachable from any start node',
  DUPLICATE_NODE_ID: 'Duplicate node ID',
  DUPLICATE_EDGE_ID: 'Duplicate edge ID',
  MULTIPLE_START_NODES: 'Multiple start nodes detected',
  NO_START_NODE: 'No start node found',
};

// ============================================================================
// Warning Messages
// ============================================================================

export const WARNING_MESSAGES: Record<WarningCode, string> = {
  // ERD
  MISSING_PRIMARY_KEY: 'Model does not have a primary key',
  FK_WITHOUT_INDEX: 'Foreign key field lacks an index',

  // Sequence
  UNUSED_PARTICIPANT: 'Participant has no messages',

  // Flow
  DECISION_FEW_BRANCHES: 'Decision node should have at least 2 outgoing edges',
  MISSING_CONDITION: 'Decision node has edges without conditions',
  FORK_JOIN_MISMATCH: 'Fork nodes count does not match join nodes count',
  COMPLEX_DIAGRAM: 'Flow diagram has many nodes - consider using groups',
};

// ============================================================================
// Suggestions
// ============================================================================

export const SUGGESTIONS: Record<ErrorCode | WarningCode, string> = {
  MISSING_DIAGRAM_TYPE: 'Add: diagram_type: erd | sequence | flow',
  INVALID_DIAGRAM_TYPE: 'Use one of: erd, sequence, flow',
  MISSING_METADATA: 'Add: metadata: { name: "Diagram Name" }',
  MISSING_METADATA_NAME: 'Add: metadata.name: "Diagram Name"',

  FK_TABLE_NOT_FOUND: 'Check the table name or create the referenced table',
  FK_COLUMN_NOT_FOUND: 'Check the column name or create the referenced column',
  CIRCULAR_DEPENDENCY: 'Redesign your schema to avoid circular references',

  PARTICIPANT_NOT_FOUND: 'Check participant ID or add the participant',
  MESSAGE_NOT_FOUND: 'Check message ID in block.messages array',
  INVALID_SEQUENCE_ORDER: 'Ensure sequence_order values are 1, 2, 3, ...',
  DUPLICATE_PARTICIPANT_ID: 'Use unique IDs for each participant',
  DUPLICATE_MESSAGE_ID: 'Use unique IDs for each message',
  MISSING_BLOCK_CONDITION: 'Add: condition: "some condition"',

  NODE_NOT_FOUND: 'Check node ID in edge source/target',
  UNREACHABLE_NODE: 'Ensure all nodes are reachable from start nodes',
  DUPLICATE_NODE_ID: 'Use unique IDs for each node',
  DUPLICATE_EDGE_ID: 'Use unique IDs for each edge',
  MULTIPLE_START_NODES: 'Use only one start node in your flow',
  NO_START_NODE: 'Add a node with type: start',

  MISSING_PRIMARY_KEY: 'Add a field with attributes.primary_key: true',
  FK_WITHOUT_INDEX: 'Consider adding an index for better query performance',

  UNUSED_PARTICIPANT: 'Remove unused participants or add messages involving them',

  DECISION_FEW_BRANCHES: 'Add at least 2 outgoing edges for decision branches',
  MISSING_CONDITION: 'Add condition to edges: condition: "condition text"',
  FORK_JOIN_MISMATCH: 'Ensure each fork has a corresponding join node',
  COMPLEX_DIAGRAM: 'Break down complex flows into smaller groups',
};

// ============================================================================
// Helper Functions
// ============================================================================

export function createError(
  code: ErrorCode,
  path: string,
  details?: string
): ValidationError {
  return {
    level: 'error',
    code,
    message: details ? `${ERROR_MESSAGES[code]}: ${details}` : ERROR_MESSAGES[code],
    path,
    suggestion: SUGGESTIONS[code],
  };
}

export function createWarning(
  code: WarningCode,
  path: string,
  details?: string
): ValidationWarning {
  return {
    level: 'warning',
    code,
    message: details ? `${WARNING_MESSAGES[code]}: ${details}` : WARNING_MESSAGES[code],
    path,
    suggestion: SUGGESTIONS[code],
  };
}

export function aggregateResults(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  diagramType: DiagramType
): ValidationResult {
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    diagramType,
  };
}
