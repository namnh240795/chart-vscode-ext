import { Node, Edge, MarkerType } from 'reactflow';
import { SequenceDiagram, SequenceParticipant, SequenceMessage, SequenceColor, SequenceBlock } from '../types/diagrams';

export interface ParsedSequenceDiagram {
  participants: Record<string, SequenceParticipant>;
  messages: SequenceMessage[];
  blocks?: SequenceBlock[];
  style?: {
    default_color?: SequenceColor;
    participant_width?: number;
    show_lifelines?: boolean;
    show_activations?: boolean;
  };
  metadata: {
    name: string;
    description?: string;
  };
}

export function parseSequenceYaml(content: string): ParsedSequenceDiagram {
  const yaml = require('yaml');
  const parsed = yaml.parse(content) as SequenceDiagram;

  // Validate required fields
  if (!parsed.diagram_type || parsed.diagram_type !== 'sequence') {
    throw new Error('Invalid diagram_type. Expected "sequence"');
  }

  if (!parsed.metadata?.name) {
    throw new Error('Missing required field: metadata.name');
  }

  if (!parsed.participants) {
    throw new Error('Missing required field: participants');
  }

  // Coerce types to ensure proper string/number values
  const participants: Record<string, SequenceParticipant> = {};
  for (const [id, participant] of Object.entries(parsed.participants)) {
    participants[id] = {
      ...participant,
      type: participant.type, // Keep as-is, already validated
      label: String(participant.label),
      description: participant.description ? String(participant.description) : undefined,
      group: participant.group ? String(participant.group) : undefined,
      color: participant.color, // Keep as-is, already validated
      order: participant.order !== undefined ? Number(participant.order) : undefined,
    };
  }

  // Coerce message types
  const messages: SequenceMessage[] = (parsed.messages || []).map((msg) => ({
    ...msg,
    id: String(msg.id),
    from: String(msg.from),
    to: String(msg.to),
    label: String(msg.label),
    arrow_type: msg.arrow_type || 'solid',
    note: msg.note ? String(msg.note) : undefined,
    sequence_order: Number(msg.sequence_order),
  }));

  // Coerce metadata types
  const metadata = {
    name: String(parsed.metadata.name),
    description: parsed.metadata.description ? String(parsed.metadata.description) : undefined,
  };

  return {
    participants,
    messages,
    blocks: parsed.blocks,
    style: parsed.style,
    metadata,
  };
}

export async function convertSequenceToReactFlow(
  parsed: ParsedSequenceDiagram
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Configuration
  const participantWidth = parsed.style?.participant_width ?? 150;
  const horizontalGap = 100;
  const startX = 50;
  const startY = 80;
  const messageSpacing = 60;
  const headerHeight = 70;

  // Get participant IDs sorted by order if specified, otherwise by key
  const participantIds = Object.keys(parsed.participants).sort((a, b) => {
    const orderA = parsed.participants[a].order ?? 0;
    const orderB = parsed.participants[b].order ?? 0;
    return orderA - orderB;
  });

  // Sort messages by sequence_order
  const sortedMessages = [...parsed.messages].sort((a, b) => a.sequence_order - b.sequence_order);

  // Calculate dimensions
  const width = startX + participantIds.length * (participantWidth + horizontalGap) + 50;
  const height = startY + headerHeight + sortedMessages.length * messageSpacing + 100;

  // Create a single sequence diagram node
  const nodes: Node[] = [
    {
      id: 'sequence-root',
      type: 'sequenceDiagram',
      position: { x: 0, y: 0 },
      data: {
        participants: parsed.participants,
        messages: parsed.messages,
        blocks: parsed.blocks,
        style: parsed.style,
      },
      draggable: false,
      style: {
        width: `${width}px`,
        height: `${height}px`,
      },
    },
  ];

  return { nodes, edges: [] };
}

function colorToHex(color: SequenceColor | undefined): string {
  if (!color) return '#3b82f6'; // Default blue

  const colorMap: Record<SequenceColor, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    orange: '#f97316',
    purple: '#8b5cf6',
    gray: '#6b7280',
    yellow: '#fbbf24',
    teal: '#14b8a6',
  };

  return colorMap[color] || '#3b82f6';
}

function getEdgeStyle(arrowType: string) {
  switch (arrowType) {
    case 'dashed':
    case 'open_dashed':
      return {
        stroke: '#64748b',
        strokeWidth: 1.5,
        strokeDasharray: '6,4',
      };
    case 'dot':
      return {
        stroke: '#64748b',
        strokeWidth: 1.5,
        strokeDasharray: '2,2',
      };
    default:
      return {
        stroke: '#64748b',
        strokeWidth: 1.5,
      };
  }
}

function getMarkerEnd(arrowType: string, color: string) {
  const isDashed = arrowType === 'dashed' || arrowType === 'open_dashed';
  const isFilled = arrowType === 'solid' || arrowType === 'dashed';
  const isOpen = arrowType === 'open_solid' || arrowType === 'open_dashed' || arrowType === 'dot';

  const markerColor = isOpen ? '#64748b' : (isFilled ? color : '#64748b');

  return {
    type: isOpen ? MarkerType.Arrow : MarkerType.ArrowClosed,
    color: markerColor,
    width: 10,
    height: 10,
  };
}
