/**
 * Flow diagram parser
 * Converts YAML flow diagram schema to React Flow nodes and edges
 */

import React from 'react';
import { FlowDiagram, FlowNodeType } from '../types/diagrams';
import { Node, Edge } from 'reactflow';
import { layoutFlowDiagram } from '../elkLayout';

export interface ParsedFlowDiagram {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Parse flow diagram YAML to React Flow format with ELK auto-layout
 */
export async function parseFlowDiagram(diagram: FlowDiagram): Promise<ParsedFlowDiagram> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create nodes (without positions - ELK will set them)
  for (const flowNode of diagram.nodes) {
    // Get dimensions for ELK layout
    const dimensions = getNodeDimensions(flowNode.type);

    nodes.push({
      id: flowNode.id,
      type: 'flowNode',
      position: { x: 0, y: 0 }, // Will be set by ELK
      data: {
        id: flowNode.id,
        type: flowNode.type,
        label: flowNode.label,
        description: flowNode.description,
        color: flowNode.data?.color,
        icon: flowNode.data?.icon,
      },
      style: {
        ...getNodeStyle(flowNode.type),
        width: dimensions.width,
        height: dimensions.height,
      },
    });
  }

  // Create edges
  for (const flowEdge of diagram.edges) {
    const edgeId = flowEdge.id || `${flowEdge.source}-${flowEdge.target}`;

    // Determine edge type based on properties
    let edgeType = 'flow';
    if (flowEdge.type === 'async') {
      edgeType = 'flowAnimated';
    } else if (flowEdge.condition) {
      edgeType = 'decision';
    }

    edges.push({
      id: edgeId,
      source: flowEdge.source,
      target: flowEdge.target,
      label: flowEdge.label,
      type: edgeType,
      animated: flowEdge.type === 'async',
      style: {
        stroke: '#ffffff',
        strokeWidth: 2,
      },
      data: {
        condition: flowEdge.condition,
        type: flowEdge.type,
        branchType: flowEdge.condition === 'approved' || flowEdge.condition === 'yes' ? 'yes' :
                   flowEdge.condition === 'rejected' || flowEdge.condition === 'no' ? 'no' : 'other',
      },
    });
  }

  // Apply ELK layout for automatic positioning
  const layouted = await layoutFlowDiagram(nodes, edges);

  // Handle groups (swimlanes, subgraphs) after layout
  if (diagram.groups && diagram.groups.length > 0) {
    for (const group of diagram.groups) {
      if (group.nodes.length === 0) continue;

      // Get positions of layouted nodes in this group
      const groupNodes = layouted.nodes.filter(n => group.nodes.includes(n.id));
      if (groupNodes.length === 0) continue;

      const minX = Math.min(...groupNodes.map(n => n.position.x));
      const minY = Math.min(...groupNodes.map(n => n.position.y));
      const maxX = Math.max(...groupNodes.map(n => n.position.x));
      const maxY = Math.max(...groupNodes.map(n => n.position.y));

      const padding = 30;
      const groupX = minX - padding;
      const groupY = minY - padding;
      const groupWidth = maxX - minX + 200 + padding * 2; // 200 is max node width
      const groupHeight = maxY - minY + 120 + padding * 2; // 120 is max node height

      layouted.nodes.push({
        id: `group-${group.id}`,
        type: 'flowGroup',
        position: { x: groupX, y: groupY },
        data: {
          id: group.id,
          label: group.label,
          type: group.type,
          nodes: group.nodes,
          layout: group.layout,
        },
        style: {
          width: groupWidth,
          height: groupHeight,
          zIndex: -1,
        },
      });
    }
  }

  return layouted;
}

/**
 * Get node dimensions for ELK layout
 * ERD-style proportions - wider and more substantial
 */
function getNodeDimensions(type: FlowNodeType): { width: number; height: number } {
  switch (type) {
    case 'start':
    case 'end':
      return { width: 120, height: 80 };
    case 'decision':
      return { width: 100, height: 100 };
    case 'process':
      return { width: 180, height: 80 };
    case 'data':
    case 'database':
    case 'document':
      return { width: 160, height: 80 };
    case 'fork':
    case 'join':
      return { width: 140, height: 60 };
    default:
      return { width: 160, height: 80 };
  }
}

function getNodeStyle(type: FlowNodeType): React.CSSProperties {
  // Base styles without width/height (set separately)
  const baseStyle: React.CSSProperties = {
    borderRadius: '8px',
    border: '2px solid',
    background: '#1e293b',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '500',
  };

  switch (type) {
    case 'start':
      return {
        ...baseStyle,
        borderColor: '#22c55e', // green
        background: '#14532d',
        borderRadius: '50%',
      };
    case 'end':
      return {
        ...baseStyle,
        borderColor: '#ef4444', // red
        background: '#450a0a',
        borderRadius: '50%',
      };
    case 'process':
      return {
        ...baseStyle,
        borderColor: '#3b82f6', // blue
        background: '#1e3a8a',
      };
    case 'decision':
      return {
        ...baseStyle,
        borderColor: '#f59e0b', // yellow
        background: '#451a03',
        transform: 'rotate(45deg)',
      };
    case 'data':
      return {
        ...baseStyle,
        borderColor: '#8b5cf6', // purple
        background: '#3b0764',
      };
    case 'database':
      return {
        ...baseStyle,
        borderColor: '#06b6d4', // cyan
        background: '#164e63',
      };
    case 'document':
      return {
        ...baseStyle,
        borderColor: '#ec4899', // pink
        background: '#831843',
        borderBottomRightRadius: '20px',
      };
    case 'fork':
    case 'join':
      return {
        ...baseStyle,
        borderColor: '#6366f1', // indigo
        background: '#312e81',
      };
    default:
      return baseStyle;
  }
}

/**
 * Get node icon based on type
 */
export function getNodeIcon(type: FlowNodeType): string {
  switch (type) {
    case 'start':
      return '▶';
    case 'end':
      return '■';
    case 'process':
      return '⚙';
    case 'decision':
      return '◆';
    case 'data':
      return '📄';
    case 'database':
      return '🗄️';
    case 'document':
      return '📝';
    case 'fork':
      return '⬍';
    case 'join':
      return '⌄';
    default:
      return '●';
  }
}

/**
 * Calculate auto-layout for flow diagram
 */
export function calculateFlowLayout(diagram: FlowDiagram): {
  width: number;
  height: number;
} {
  if (diagram.nodes.length === 0) {
    return { width: 800, height: 600 };
  }

  // Find bounds from node positions
  const positions = diagram.nodes.map(n => n.position);
  const maxX = Math.max(...positions.map(p => p.x)) + 200;
  const maxY = Math.max(...positions.map(p => p.y)) + 100;

  return {
    width: Math.max(800, maxX),
    height: Math.max(600, maxY),
  };
}
