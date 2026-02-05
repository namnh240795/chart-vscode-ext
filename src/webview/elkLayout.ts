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
