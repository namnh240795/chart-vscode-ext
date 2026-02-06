/**
 * Unified diagram types for .cryml files
 * Supports ERD, Sequence, and Flow diagram types
 */

// ============================================================================
// Common Types
// ============================================================================

export type DiagramType = 'erd' | 'sequence' | 'flow';

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
// Sequence Diagram Types
// ============================================================================

export interface SequenceDiagram extends BaseDiagram {
  diagram_type: 'sequence';
  metadata: DiagramMetadata;
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  blocks?: SequenceBlock[];
  notes?: SequenceNote[];
}

export interface SequenceParticipant {
  id: string;
  type: 'actor' | 'participant' | 'database';
  label: string;
  description?: string;
}

export interface SequenceMessage {
  id: string;
  from: string; // Participant ID
  to: string; // Participant ID
  label: string;
  type: 'sync' | 'async';
  return_message?: string;
  sequence_order: number;
}

export interface SequenceBlock {
  id: string;
  type: 'alt' | 'opt' | 'loop' | 'par' | 'rect';
  condition?: string;
  label?: string;
  messages: string[]; // Message IDs
  parent_block?: string;
}

export interface SequenceNote {
  id: string;
  text: string;
  attached_to?: string[]; // Participant or message IDs
  position?: 'left' | 'right' | 'top' | 'bottom';
}

// ============================================================================
// Flow Diagram Types
// ============================================================================

export interface FlowDiagram extends BaseDiagram {
  diagram_type: 'flow';
  metadata: DiagramMetadata;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups?: FlowGroup[];
}

export type FlowNodeType =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'data'
  | 'database'
  | 'document'
  | 'fork'
  | 'join';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  description?: string;
  position: FlowPosition;
  data?: FlowNodeData;
}

export interface FlowPosition {
  x: number;
  y: number;
}

export interface FlowNodeData {
  color?: string;
  icon?: string;
}

export interface FlowEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  label?: string;
  condition?: string;
  type?: string;
}

export type FlowGroupType = 'swimlane' | 'subgraph';

export interface FlowGroup {
  id: string;
  label: string;
  type: FlowGroupType;
  nodes: string[]; // Node IDs
  layout?: 'horizontal' | 'vertical';
}

// ============================================================================
// Union Type
// ============================================================================

export type AnyDiagram = ERDDiagram | SequenceDiagram | FlowDiagram;

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isERDDiagram(diagram: AnyDiagram): diagram is ERDDiagram {
  return diagram.diagram_type === 'erd';
}

export function isSequenceDiagram(diagram: AnyDiagram): diagram is SequenceDiagram {
  return diagram.diagram_type === 'sequence';
}

export function isFlowDiagram(diagram: AnyDiagram): diagram is FlowDiagram {
  return diagram.diagram_type === 'flow';
}
