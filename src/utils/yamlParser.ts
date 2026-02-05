// YAML Parser utility for converting YAML to React Flow format

import { Node, Edge } from 'reactflow';
import { FlowChartYaml, NodeYaml, EdgeYaml } from '../types/yaml';

export function parseFlowChartYaml(yamlContent: string): {
  nodes: Node[];
  edges: Edge[];
} {
  // Parse YAML (you'll need to install a YAML parser)
  // For now, this is a placeholder that shows the structure
  const parsed: FlowChartYaml = JSON.parse(JSON.stringify(yamlContent));

  const nodes: Node[] = (parsed.nodes || []).map((nodeYaml: NodeYaml) => ({
    id: nodeYaml.id,
    type: nodeYaml.type,
    position: nodeYaml.position,
    data: {
      label: nodeYaml.label,
      ...nodeYaml.data,
    },
  }));

  const edges: Edge[] = (parsed.edges || []).map((edgeYaml: EdgeYaml) => ({
    id: edgeYaml.id,
    source: edgeYaml.source,
    target: edgeYaml.target,
    label: edgeYaml.label,
    animated: edgeYaml.animated || false,
    type: (edgeYaml.type as any) || 'default',
    style: edgeYaml.style,
  }));

  return { nodes, edges };
}

export function convertPrismaYamlToFlowChart(
  prismaYaml: any
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yOffset = 50;

  // Convert models to nodes
  (prismaYaml.models || []).forEach((model: any, index: number) => {
    const xPos = 250 + (index % 3) * 300;
    const yPos = 50 + Math.floor(index / 3) * 200;

    nodes.push({
      id: model.name,
      type: 'default',
      position: { x: xPos, y: yPos },
      data: {
        label: model.name,
        isModel: true,
        fieldCount: model.fields?.length || 0,
      },
    });

    // Create relationships as edges
    if (model.fields) {
      model.fields.forEach((field: any) => {
        if (field.relation) {
          edges.push({
            id: `${model.name}-${field.name}`,
            source: model.name,
            target: field.relation.split('.')[0] || field.relation,
            label: field.name,
            animated: true,
            type: 'smoothstep',
          });
        }
      });
    }
  });

  return { nodes, edges };
}
