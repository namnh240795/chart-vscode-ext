/**
 * Diagram types for .cryml files
 * Supports ERD diagram type
 */

// ============================================================================
// Common Types
// ============================================================================

export type DiagramType = 'erd';

export interface BaseDiagram {
  diagram_type: DiagramType;
  metadata: DiagramMetadata;
}

export interface DiagramMetadata {
  name: string;
  description?: string;
  version?: string;
}

// ============================================================================
// ERD Diagram Types
// ============================================================================

export interface ERDDiagram extends BaseDiagram {
  diagram_type: 'erd';
  metadata: DiagramMetadata;
  colors?: ERDColors;
  models: Record<string, ERDModel>;
  enums?: Record<string, ERDEnum>;
}

export interface ERDColors {
  default: 'yellow' | 'red' | 'teal';
  rules?: ERDColorRule[];
}

export interface ERDColorRule {
  pattern: string;
  color: 'yellow' | 'red' | 'teal';
  group: string;
}

export interface ERDModel {
  color?: 'yellow' | 'red' | 'teal';
  group?: string;
  table_name?: string;
  schema_name?: string;
  fields: Record<string, ERDField>;
  indexes?: ERDIndex[];
  unique_constraints?: ERDUniqueConstraint[];
}

export interface ERDField {
  field_type: string;
  db_type?: string;
  constraints?: ERDConstraints;
  attributes?: ERDFieldAttributes;
}

export interface ERDConstraints {
  not_null?: boolean;
}

export interface ERDFieldAttributes {
  primary_key?: boolean;
  unique?: boolean;
  default_value?: string;
  foreign_key?: ERDForeignKey;
  virtual?: boolean;
  referenced_by?: string;
  is_list?: boolean;
  map?: string;
  relation_name?: string;
}

export interface ERDForeignKey {
  table: string;
  column: string;
  on_delete?: string;
  on_update?: string;
}

export interface ERDIndex {
  index_name: string;
  columns: string[];
  unique?: boolean;
}

export interface ERDUniqueConstraint {
  constraint_name: string;
  columns: string[];
}

export interface ERDEnum {
  values: ERDEnumValue[];
}

export interface ERDEnumValue {
  value_name: string;
  description?: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type AnyDiagram = ERDDiagram;

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isERDDiagram(diagram: AnyDiagram): diagram is ERDDiagram {
  return diagram.diagram_type === 'erd';
}
