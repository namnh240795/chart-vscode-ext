/**
 * Diagram types for .cryml files
 * Supports ERD, Flow, and Sequence diagram types
 */

// ============================================================================
// Common Types
// ============================================================================

export type DiagramType = 'erd' | 'flow' | 'sequence';

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
// Flow Diagram Types
// ============================================================================

export interface FlowDiagram extends BaseDiagram {
  diagram_type: 'flow';
  metadata: DiagramMetadata;
  style?: FlowStyle;
  nodes: Record<string, FlowNode>;
  edges: FlowEdge[];
  groups?: Record<string, FlowGroup>;
}

export interface FlowStyle {
  default_color?: FlowColor;
  node_size?: 'small' | 'medium' | 'large';
}

export type FlowColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';

export interface FlowNode {
  type: 'start' | 'end' | 'process' | 'decision' | 'note';
  label: string;
  description?: string;
  group?: string;
  position?: { x: number; y: number };
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

export interface FlowGroup {
  color?: FlowColor;
  collapsed?: boolean;
  label?: string;
}

// ============================================================================
// Sequence Diagram Types
// ============================================================================

export interface SequenceDiagram extends BaseDiagram {
  diagram_type: 'sequence';
  metadata: DiagramMetadata;
  style?: SequenceStyle;
  participants: Record<string, SequenceParticipant>;
  messages: SequenceMessage[];
  notes?: SequenceNote[];
  blocks?: SequenceBlock[];
}

export interface SequenceStyle {
  default_color?: SequenceColor;
  participant_width?: number;
  show_lifelines?: boolean;
  show_activations?: boolean;
}

export type SequenceColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray' | 'yellow' | 'teal';

export type ParticipantType = 'participant' | 'actor';

export interface SequenceParticipant {
  type: ParticipantType;
  label: string;
  description?: string;
  group?: string;
  color?: SequenceColor;
  order?: number; // For controlling the horizontal order
}

export type ArrowType = 'solid' | 'dashed' | 'open_solid' | 'open_dashed' | 'dot';

export interface SequenceMessage {
  id: string;
  from: string; // Participant ID
  to: string; // Participant ID
  label: string;
  arrow_type?: ArrowType;
  note?: string;
  sequence_order: number; // For vertical ordering (time)
}

export interface SequenceNote {
  id: string;
  text: string;
  position: {
    participant?: string; // Over a specific participant
    over?: string[]; // Over multiple participants
    y: number; // Vertical position
  };
  style?: 'note' | 'warning' | 'error';
}

export type BlockType = 'alt' | 'opt' | 'loop' | 'par' | 'critical' | 'neg';

export interface AltSection {
  condition?: string; // Condition for this section (e.g., "authenticated", "has cache")
  messages: string[]; // Message IDs in this section
}

export interface SequenceBlock {
  id: string;
  type: BlockType;
  label?: string;
  condition?: string;
  messages: string[]; // Message IDs in this block
  alt_sections?: AltSection[]; // For alt blocks: multiple alternative paths
  sequence_order: number;
}

// ============================================================================
// Union Type
// ============================================================================

export type AnyDiagram = ERDDiagram | FlowDiagram | SequenceDiagram;

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isERDDiagram(diagram: AnyDiagram): diagram is ERDDiagram {
  return diagram.diagram_type === 'erd';
}

export function isFlowDiagram(diagram: AnyDiagram): diagram is FlowDiagram {
  return diagram.diagram_type === 'flow';
}

export function isSequenceDiagram(diagram: AnyDiagram): diagram is SequenceDiagram {
  return diagram.diagram_type === 'sequence';
}
