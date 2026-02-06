// ELK Layout for Prisma Schema
import { Node, Edge } from 'reactflow';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs';

const elk = new ELK();

export async function layoutWithElk(nodes: Node[], edges: Edge[]): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  // Build ELK graph
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.spacing.edgeNode': '50',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: Number(node.style?.width || 320),
      height: Number(node.style?.height || 200),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  // Apply layout
  const layoutedGraph = await elk.layout(elkGraph);

  // Map back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x || 0,
        y: elkNode?.y || 0,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * ELK Layout specifically optimized for Flow Diagrams
 * Handles different node types (start/end, process, decision) with proper sizing
 */
export async function layoutFlowDiagram(nodes: Node[], edges: Edge[]): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  // Get node dimensions based on type
  const getNodeDimensions = (node: Node) => {
    const data = node.data as any;
    const type = data?.type || 'process';

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
  };

  // Build ELK graph optimized for flow diagrams
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      // Use layered algorithm for flow diagrams
      'elk.algorithm': 'layered',

      // Top to bottom direction
      'elk.direction': 'DOWN',

      // ERD-style spacing - more spacious
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.spacing.edgeNode': '40',
      'elk.spacing.edgeEdge': '30',

      // Node placement
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',

      // Edge routing - orthogonal (right angles)
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.edgeRouting.orthogonalEdges': 'true',

      // Port constraints for better edge connections
      'elk.portConstraints': 'FIXED_ORDER',
      'elk.layered.considerModelOrder.strategy': 'PREFER_INTERTS',

      // Separate connected components
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '100',
    },
    children: nodes.map((node) => {
      const dimensions = getNodeDimensions(node);
      return {
        id: node.id,
        width: dimensions.width,
        height: dimensions.height,
        // Add port hints for decision nodes (multiple outputs)
        layoutOptions: (node.data?.type === 'decision') ? {
          'elk.port.side': 'SOUTH',
        } : undefined,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      // Add label dimensions for better edge routing
      labels: edge.label ? [{
        id: `${edge.id}-label`,
        text: String(edge.label),
        // Estimate label size
        width: edge.label ? String(edge.label).length * 8 : 50,
        height: 20,
      }] : [],
    })),
  };

  try {
    console.log('ELK: Starting layout with', nodes.length, 'nodes and', edges.length, 'edges');
    console.log('ELK graph:', elkGraph);

    // Apply layout
    const layoutedGraph = await elk.layout(elkGraph);

    console.log('ELK: Layout result', layoutedGraph);

    // Map back to React Flow nodes
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);

      // Add padding to position
      return {
        ...node,
        position: {
          x: (elkNode?.x || 0) + 50,
          y: (elkNode?.y || 0) + 50,
        },
      };
    });

    console.log('ELK: Layouted nodes', layoutedNodes);

    return {
      nodes: layoutedNodes,
      edges,
    };
  } catch (error) {
    console.error('ELK layout error:', error);
    // Fallback to original positions
    return { nodes, edges };
  }
}

