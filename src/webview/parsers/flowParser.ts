import { Node, Edge, MarkerType } from 'reactflow';
import { FlowDiagram, FlowNode as FlowNodeType, FlowEdge as FlowEdgeType, FlowGroup, FlowStyle, FlowColor } from '../types/diagrams';
import { layoutFlowDiagram } from '../elkLayout';

export interface ParsedFlowDiagram {
  nodes: Record<string, FlowNodeType>;
  edges: FlowEdgeType[];
  groups?: Record<string, FlowGroup>;
  style?: FlowStyle;
  metadata: {
    name: string;
    description?: string;
  };
}

export function parseFlowYaml(content: string): ParsedFlowDiagram {
  const yaml = require('yaml');
  const parsed = yaml.parse(content) as FlowDiagram;

  // Validate required fields
  if (!parsed.diagram_type || parsed.diagram_type !== 'flow') {
    throw new Error('Invalid diagram_type. Expected "flow"');
  }

  if (!parsed.metadata?.name) {
    throw new Error('Missing required field: metadata.name');
  }

  if (!parsed.nodes) {
    throw new Error('Missing required field: nodes');
  }

  return {
    nodes: parsed.nodes,
    edges: parsed.edges || [],
    groups: parsed.groups,
    style: parsed.style,
    metadata: {
      name: parsed.metadata.name,
      description: parsed.metadata.description,
    },
  };
}

export async function convertFlowToReactFlow(
  parsed: ParsedFlowDiagram
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create React Flow nodes
  for (const [nodeId, flowNode] of Object.entries(parsed.nodes)) {
    const color = getGroupColor(flowNode.group, parsed.groups, parsed.style?.default_color);

    nodes.push({
      id: nodeId,
      type: flowNode.type,
      position: flowNode.position || { x: 0, y: 0 },
      data: {
        label: flowNode.label,
        description: flowNode.description,
        type: flowNode.type,
        group: flowNode.group,
        color: color,
      },
      // Let nodes auto-size based on content
      draggable: true,
    });
  }

  // Create React Flow edges
  parsed.edges.forEach((flowEdge, index) => {
    // Determine if source is a decision node
    const sourceNode = parsed.nodes[flowEdge.from];
    const isDecisionSource = sourceNode?.type === 'decision';

    // Map edge labels to decision node handle IDs
    let sourceHandle: string | undefined = undefined;
    if (isDecisionSource && flowEdge.label) {
      const labelLower = flowEdge.label.toLowerCase();
      if (labelLower === 'yes' || labelLower === 'true' || labelLower === 'valid') {
        sourceHandle = 'yes';
      } else if (labelLower === 'no' || labelLower === 'false' || labelLower === 'invalid') {
        sourceHandle = 'no';
      } else if (labelLower === 'bottom' || labelLower === 'continue') {
        sourceHandle = 'bottom';
      }
    }

    edges.push({
      id: `edge-${index}`,
      source: flowEdge.from,
      target: flowEdge.to,
      sourceHandle: sourceHandle,
      label: flowEdge.label,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#64748b',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
        width: 12,
        height: 12,
      },
      labelStyle: {
        fontSize: 12,
        fontWeight: 500,
        fill: '#f1f5f9',
      },
      labelBgStyle: {
        fill: '#2d2d2d',
        fillOpacity: 0.95,
      },
    });
  });

  // Check if any node has manual positions
  const hasManualPositions = nodes.some(
    (n) => n.position.x !== 0 || n.position.y !== 0
  );

  // Apply ELK layout only if no manual positions are set
  if (!hasManualPositions) {
    return layoutFlowDiagram(nodes, edges);
  }

  return { nodes, edges };
}

/**
 * Calculate node dimensions with dynamic sizing based on content
 */
function getNodeDimensions(
  node: FlowNodeType,
  globalSize?: 'small' | 'medium' | 'large'
): { width: number; height: number } {
  const size = globalSize || 'medium';
  const sizeMultipliers: Record<string, number> = {
    small: 0.8,
    medium: 1,
    large: 1.2,
  };
  const multiplier = sizeMultipliers[size];

  // Calculate text length for dynamic sizing
  const labelLength = node.label.length;
  const descriptionLength = node.description?.length || 0;
  const totalTextLength = labelLength + descriptionLength;

  // Base dimensions
  const baseDimensions = { width: 160, height: 80 };

  switch (node.type) {
    case 'start':
    case 'end': {
      const width = Math.max(120, Math.min(200, 80 + labelLength * 8));
      return { width: Math.round(width * multiplier), height: Math.round(60 * multiplier) };
    }
    case 'decision': {
      // Decision nodes need to be square-ish for the diamond shape
      const size = Math.max(120, Math.min(160, 100 + Math.ceil(labelLength / 3) * 10));
      return { width: Math.round(size * multiplier), height: Math.round(size * multiplier) };
    }
    case 'process': {
      // Dynamic width based on label length
      const width = Math.max(140, Math.min(300, 100 + labelLength * 9));
      // Add height if there's a description
      const hasDescription = descriptionLength > 0;
      const height = hasDescription ? 100 : 80;
      return { width: Math.round(width * multiplier), height: Math.round(height * multiplier) };
    }
    case 'note': {
      // Notes need more space for text
      const width = Math.max(180, Math.min(350, 140 + Math.ceil(totalTextLength / 15) * 20));
      const lines = Math.ceil(totalTextLength / 25) + (descriptionLength > 0 ? 1 : 0);
      const height = Math.max(80, Math.min(180, 60 + lines * 20));
      return { width: Math.round(width * multiplier), height: Math.round(height * multiplier) };
    }
    default:
      return { width: Math.round(160 * multiplier), height: Math.round(80 * multiplier) };
  }
}

function getGroupColor(
  groupName: string | undefined,
  groups?: Record<string, FlowGroup>,
  defaultColor?: FlowColor
): string {
  if (defaultColor) {
    return colorToHex(defaultColor);
  }

  if (!groupName || !groups) {
    return '#3b82f6'; // Default blue
  }

  const group = groups[groupName];
  if (!group?.color) {
    return '#3b82f6'; // Default blue
  }

  return colorToHex(group.color);
}

function colorToHex(color: FlowColor): string {
  const colorMap: Record<FlowColor, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    orange: '#f97316',
    purple: '#8b5cf6',
    gray: '#6b7280',
  };

  return colorMap[color] || '#3b82f6';
}
