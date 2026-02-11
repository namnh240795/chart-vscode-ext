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

  // Coerce types to ensure proper string/number values
  const nodes: Record<string, FlowNodeType> = {};
  for (const [nodeId, node] of Object.entries(parsed.nodes)) {
    nodes[nodeId] = {
      ...node,
      type: node.type, // Keep as-is, already validated
      label: String(node.label),
      description: node.description ? String(node.description) : undefined,
      group: node.group ? String(node.group) : undefined,
      position: node.position ? {
        x: Number(node.position.x),
        y: Number(node.position.y),
      } : undefined,
    };
  }

  // Coerce edge types
  const edges: FlowEdgeType[] = (parsed.edges || []).map((edge) => ({
    from: String(edge.from),
    to: String(edge.to),
    label: edge.label ? String(edge.label) : undefined,
    condition: edge.condition ? String(edge.condition) : undefined,
  }));

  // Coerce metadata types
  const metadata = {
    name: String(parsed.metadata.name),
    description: parsed.metadata.description ? String(parsed.metadata.description) : undefined,
  };

  return {
    nodes,
    edges,
    groups: parsed.groups,
    style: parsed.style,
    metadata,
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
    const groupLabel = flowNode.group ? parsed.groups?.[flowNode.group]?.label || flowNode.group : undefined;

    nodes.push({
      id: nodeId,
      type: flowNode.type,
      position: flowNode.position || { x: 0, y: 0 },
      data: {
        label: flowNode.label,
        description: flowNode.description,
        type: flowNode.type,
        group: flowNode.group,
        groupLabel: groupLabel,
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
      if (labelLower === 'yes' || labelLower === 'true' || labelLower === 'valid' || labelLower === 'ship' || labelLower === 'ok') {
        sourceHandle = 'yes';
      } else if (labelLower === 'no' || labelLower === 'false' || labelLower === 'invalid' || labelLower === 'damaged' || labelLower === 'error') {
        sourceHandle = 'no';
      } else if (labelLower === 'bottom' || labelLower === 'continue' || labelLower === 'next' || labelLower === 'retry') {
        sourceHandle = 'bottom';
      }
    }

    edges.push({
      id: `edge-${index}`,
      source: flowEdge.from,
      target: flowEdge.to,
      sourceHandle: sourceHandle,
      label: flowEdge.label,
      // Use smoothstep for clean right-angle edges that match orthogonal ELK routing
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#64748b',
        strokeWidth: 2.5,
        // Slightly transparent for a modern look
        strokeOpacity: 0.9,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
        width: 14,
        height: 14,
        strokeWidth: 0,
      },
      // Enhanced label styling
      labelStyle: {
        fontSize: 13,
        fontWeight: 600,
        fill: '#f8fafc',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      },
      labelBgStyle: {
        fill: '#1e293b',
        fillOpacity: 0.92,
        stroke: '#334155',
        strokeWidth: 1,
        rx: 4,
        ry: 4,
        padding: '4px 8px',
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
