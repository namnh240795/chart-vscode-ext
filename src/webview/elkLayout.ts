// ELK Layout for Prisma Schema
import { Node, Edge } from 'reactflow';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs';

const elk = new ELK();

/**
 * Canvas for measuring text dimensions
 */
let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCanvas(): HTMLCanvasElement {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
  }
  return measureCanvas;
}

/**
 * Measure text dimensions using Canvas API
 * This gives accurate measurements before rendering
 */
function measureTextDimensions(
  text: string,
  fontSize: number,
  fontWeight: string = '600',
  fontFamily: string = 'system-ui, -apple-system, sans-serif'
): { width: number; height: number } {
  try {
    const canvas = getMeasureCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas 2D context not available, using fallback text measurement');
      // Fallback to simple calculation
      return { width: text.length * fontSize * 0.6, height: fontSize * 1.2 };
    }

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);

    // Measure multiple lines
    const lines = text.split('\n');
    let maxWidth = 0;
    lines.forEach(line => {
      const lineMetrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, lineMetrics.width);
    });

    const result = {
      width: Math.ceil(maxWidth),
      height: Math.ceil(fontSize * 1.2 * lines.length),
    };
    console.log(`Text measurement: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" ->`, result);
    return result;
  } catch (error) {
    console.error('Error measuring text dimensions:', error);
    // Fallback to simple calculation
    return { width: text.length * fontSize * 0.6, height: fontSize * 1.2 };
  }
}

/**
 * Get CSS styles for a node type
 */
function getNodeStyles(type: string): {
  padding: { top: number; right: number; bottom: number; left: number };
  border: number;
  fontSize: { label: number; description: number };
  lineHeight: number;
} {
  switch (type) {
    case 'start':
    case 'end':
      return {
        padding: { top: 12, right: 24, bottom: 12, left: 24 },
        border: 2,
        fontSize: { label: 14, description: 12 },
        lineHeight: 1.2,
      };
    case 'decision':
      return {
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
        border: 2,
        fontSize: { label: 14, description: 12 },
        lineHeight: 1.2,
      };
    case 'process':
      return {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        border: 2,
        fontSize: { label: 14, description: 12 },
        lineHeight: 1.2,
      };
    case 'note':
      return {
        padding: { top: 12, right: 16, bottom: 12, left: 40 },
        border: 2,
        fontSize: { label: 14, description: 12 },
        lineHeight: 1.4,
      };
    default:
      return {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        border: 2,
        fontSize: { label: 14, description: 12 },
        lineHeight: 1.2,
      };
  }
}

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
 * Calculate dynamic node dimensions based on actual text measurements
 * Uses Canvas API to measure text before rendering
 * These dimensions match the actual rendered size including all styling
 */
function calculateDynamicNodeDimensions(node: Node): { width: number; height: number } {
  const data = node.data as any;
  const type = data?.type || 'process';
  const label = data?.label || '';
  const description = data?.description || '';

  console.log(`\n=== Calculating dimensions for node "${node.id}" (${type}) ===`);
  console.log(`Label: "${label}"`);
  console.log(`Description: "${description}"`);

  const styles = getNodeStyles(type);
  console.log(`Styles:`, styles);

  // Measure text dimensions using Canvas API
  const labelMetrics = measureTextDimensions(label, styles.fontSize.label, '600');
  const descriptionMetrics = description
    ? measureTextDimensions(description, styles.fontSize.description, '400')
    : { width: 0, height: 0 };

  let contentWidth: number;
  let contentHeight: number;
  let result: { width: number; height: number };

  switch (type) {
    case 'start':
    case 'end': {
      // Pill shapes - width based on label measurement
      contentWidth = Math.max(80, labelMetrics.width + 10);
      contentHeight = labelMetrics.height;

      // Add padding
      const width = contentWidth + styles.padding.left + styles.padding.right + styles.border * 2;
      const height = contentHeight + styles.padding.top + styles.padding.bottom + styles.border * 2;

      result = { width, height: Math.max(height, 50) };
      break;
    }

    case 'decision': {
      // Diamond shapes need to fit text in the center area
      // The diamond is a square with text fitting in the middle ~60%
      const textWidth = Math.max(labelMetrics.width, descriptionMetrics.width);
      const textHeight = labelMetrics.height + (description ? descriptionMetrics.height + 4 : 0);

      // Calculate diamond size needed to fit text
      const diagonalTextSize = Math.sqrt(textWidth * textWidth + textHeight * textWidth);
      const baseSize = Math.max(140, Math.ceil(diagonalTextSize * 1.8));

      // Add padding allowance for the SVG
      const size = baseSize + styles.padding.left + styles.padding.right + styles.border * 2;

      result = { width: size, height: size };
      break;
    }

    case 'process': {
      // Rectangle nodes with potential description and group badge
      contentWidth = Math.max(labelMetrics.width + 8, 120);
      contentHeight = labelMetrics.height;

      // Add description height
      if (description) {
        contentHeight += descriptionMetrics.height + 4;
        contentWidth = Math.max(contentWidth, descriptionMetrics.width + 8);
      }

      // Add group badge height
      const hasGroup = data.group && data.groupLabel;
      if (hasGroup) {
        contentHeight += 20; // Badge height
        // Badge width
        const badgeWidth = measureTextDimensions(data.groupLabel, 10, '500').width + 16;
        contentWidth = Math.max(contentWidth, badgeWidth);
      }

      // Add padding
      const width = contentWidth + styles.padding.left + styles.padding.right + styles.border * 2;
      const height = contentHeight + styles.padding.top + styles.padding.bottom + styles.border * 2;

      result = { width, height };
      break;
    }

    case 'note': {
      // Note nodes with extra left padding for icon
      contentWidth = Math.max(labelMetrics.width + 8, 120);
      contentHeight = labelMetrics.height;

      // Add description height
      if (description) {
        // Handle multi-line descriptions - more compact wrapping
        const descLines = Math.ceil(descriptionMetrics.width / 150); // Wrap at ~150px
        contentHeight += descriptionMetrics.height * Math.min(descLines, 4) + 4;
        contentWidth = Math.max(contentWidth, Math.min(descriptionMetrics.width + 8, 160));
      }

      // Add padding (note has extra left padding for icon)
      const width = contentWidth + styles.padding.left + styles.padding.right + styles.border * 2;
      const height = contentHeight + styles.padding.top + styles.padding.bottom + styles.border * 2;

      result = { width: Math.max(width, 160), height: Math.max(height, 70) };
      break;
    }

    case 'fork':
    case 'join': {
      const width = 150 + styles.padding.left + styles.padding.right;
      const height = 60 + styles.padding.top + styles.padding.bottom;
      result = { width, height };
      break;
    }

    default: {
      // Generic node
      contentWidth = Math.max(labelMetrics.width + 8, 130);
      contentHeight = labelMetrics.height + (description ? descriptionMetrics.height + 4 : 0);

      const width = contentWidth + styles.padding.left + styles.padding.right + styles.border * 2;
      const height = contentHeight + styles.padding.top + styles.padding.bottom + styles.border * 2;

      result = { width, height };
      break;
    }
  }

  console.log(`Final dimensions for node "${node.id}":`, result);
  return result;
}

/**
 * Group nodes by their group property for clustering
 */
function groupNodesByCluster(nodes: Node[]): Map<string, Node[]> {
  const groups = new Map<string, Node[]>();

  // First pass: group nodes by their group property
  for (const node of nodes) {
    const group = (node.data as any)?.group || 'default';
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(node);
  }

  return groups;
}

/**
 * ELK Layout specifically optimized for Flow Diagrams
 * Handles different node types (start/end, process, decision) with proper sizing
 * Includes group clustering, improved edge routing, and aspect ratio optimization
 * Fixes issues with note overlap, spacing, and edge routing
 *
 * @param nodes - The nodes to layout
 * @param edges - The edges between nodes
 * @param direction - Layout direction: 'DOWN' for top-down, 'RIGHT' for left-right
 */
export async function layoutFlowDiagram(
  nodes: Node[],
  edges: Edge[],
  direction: 'DOWN' | 'RIGHT' = 'DOWN'
): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  // Group nodes by cluster for visual organization
  const nodeClusters = groupNodesByCluster(nodes);
  const hasGroups = nodeClusters.size > 1;

  // Detect note nodes for special handling
  const noteNodes = nodes.filter(n => (n.data as any)?.type === 'note');
  const hasNoteNodes = noteNodes.length > 0;

  // Calculate dynamic dimensions for all nodes FIRST (this is critical!)
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  for (const node of nodes) {
    nodeDimensions.set(node.id, calculateDynamicNodeDimensions(node));
  }

  // Calculate maximum node sizes for spacing calculations
  const maxNodeHeight = Math.max(...Array.from(nodeDimensions.values()).map(d => d.height));
  const maxNodeWidth = Math.max(...Array.from(nodeDimensions.values()).map(d => d.width));
  const avgNodeHeight = Array.from(nodeDimensions.values()).reduce((sum, d) => sum + d.height, 0) / nodeDimensions.size;

  // Reasonable spacing - use average height for more compact layout
  // Layer spacing based on average node height, not max
  const baseLayerSpacing = Math.max(60, Math.ceil(avgNodeHeight * 1.0));
  // Horizontal spacing based on average width
  const horizontalNodeSpacing = Math.max(40, Math.ceil(maxNodeWidth * 0.2));

  // Detect if this is a wide diagram (more horizontal branches)
  const decisionNodes = nodes.filter(n => (n.data as any)?.type === 'decision');
  const hasComplexBranching = decisionNodes.some(n => {
    const outgoingEdges = edges.filter(e => e.source === n.id);
    return outgoingEdges.length > 2;
  });

  console.log('ELK Layout Calculations:');
  console.log('  Max node height:', maxNodeHeight);
  console.log('  Max node width:', maxNodeWidth);
  console.log('  Average node height:', avgNodeHeight);
  console.log('  Layer spacing:', baseLayerSpacing);
  console.log('  Horizontal spacing:', horizontalNodeSpacing);

  // Build ELK graph optimized for flow diagrams
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      // Use layered algorithm for flow diagrams
      'elk.algorithm': 'layered',

      // Layout direction (DOWN for top-down, RIGHT for left-right)
      'elk.direction': direction,

      // More vertical aspect ratio to give nodes breathing room
      // Use a wider ratio to give notes more space on the sides
      'elk.aspectRatio': hasComplexBranching ? '1.5' : '1.2',

      // Moderate spacing to prevent overlap
      'elk.spacing.nodeNode': String(horizontalNodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(baseLayerSpacing),
      'elk.spacing.edgeNode': '50',
      'elk.spacing.edgeEdge': '40',
      'elk.spacing.labelLabel': '25',
      'elk.spacing.labelNode': '20',
      'elk.spacing.portPort': '20',

      // Node placement strategy - use INTERACTIVE to better position notes
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTUP',

      // Cycle breaking strategy
      'elk.layered.cycleBreaking.strategy': 'GREEDY',

      // Crossing minimization
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.crossingMinimization.semiInteractive': 'true',

      // Use ORTHOGONAL routing for clean right-angle edges
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.edgeRouting.orthogonalEdges': 'true',

      // Port constraints for better edge connections
      'elk.portConstraints': 'FIXED_ORDER',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.portConstraints': 'FIXED_ORDER',

      // Layering strategy for better hierarchy
      'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.layering.nodePromotion.strategy': 'DUMMYNODE_PERCENTAGE',

      // Separate connected components with moderate space
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '100',

      // Enable grouping for visual organization
      ...(hasGroups && {
        'elk.spacing.clusterCluster': '150',
      }),

      // Label handling
      'elk.nodeLabels.placement': 'INSIDE V_CENTER H_CENTER',
      'elk.edgeLabels.placement': 'CENTER',
      'elk.edgeLabels.inlineDegree': '1',
    },
    children: nodes.map((node) => {
      const dimensions = nodeDimensions.get(node.id)!;
      const nodeType = node.data?.type;
      const group = (node.data as any)?.group;

      // Type-specific layout options
      const typeSpecificOptions: Record<string, string> = {};

      // Decision nodes need special port configuration
      if (nodeType === 'decision') {
        const outgoingEdges = edges.filter(e => e.source === node.id);
        typeSpecificOptions['elk.port.side'] = 'SOUTH';
        typeSpecificOptions['elk.portConstraints'] = 'FIXED_ORDER';

        // Configure ports based on number of outgoing edges
        if (outgoingEdges.length > 2) {
          typeSpecificOptions['elk.spacing.portPort'] = '30';
        }
      }

      // Note nodes need special handling - position as side notes
      if (nodeType === 'note') {
        // Configure note to be positioned as side node
        typeSpecificOptions['elk.portConstraints'] = 'FIXED_ORDER';
        // Tell ELK to position notes on the right side
        typeSpecificOptions['elk.layered.priority.direction'] = '10';
        // Reduce spacing for notes to keep them close to connected nodes
        typeSpecificOptions['elk.spacing.nodeNode'] = String(Math.max(30, horizontalNodeSpacing * 0.4));
      }

      // Group-based clustering
      if (group && hasGroups) {
        typeSpecificOptions['elk.cluster.hierarchyHandling'] = 'INCLUDE_CHILDREN';
      }

      return {
        id: node.id,
        width: dimensions.width,
        height: dimensions.height,
        // Add labels to node for proper sizing consideration
        labels: node.data?.label ? [{
          id: `${node.id}-label`,
          text: String(node.data.label),
          width: dimensions.width * 0.75,
          height: 20,
        }] : [],
        // Add type-specific layout options
        layoutOptions: Object.keys(typeSpecificOptions).length > 0
          ? typeSpecificOptions
          : undefined,
      };
    }),
    edges: edges.map((edge) => {
      // More accurate label sizing
      const labelText = String(edge.label || '');
      const labelWidth = Math.max(70, labelText.length * 13);

      return {
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        // Enhanced label configuration for better positioning
        labels: edge.label ? [{
          id: `${edge.id}-label`,
          text: labelText,
          width: labelWidth,
          height: 30,
          // Label placement options
          layoutOptions: {
            'elk.edgeLabels.placement': 'CENTER',
            'elk.edgeLabels.inlineDegree': '1',
          },
        }] : [],
        // Edge-specific routing options
        layoutOptions: {
          'elk.edgeRouting': 'ORTHOGONAL',
        },
      };
    }),
  };

  try {
    console.log('ELK: Starting enhanced layout with', nodes.length, 'nodes and', edges.length, 'edges');
    console.log('ELK: Node dimensions:', Object.fromEntries(nodeDimensions));
    console.log('ELK: Groups detected:', Array.from(nodeClusters.keys()));
    console.log('ELK: Note nodes detected:', hasNoteNodes, 'count:', noteNodes.length);

    // Apply layout
    const layoutedGraph = await elk.layout(elkGraph);

    console.log('ELK: Layout result', layoutedGraph);

    // Calculate bounding box for proper padding
    let maxX = 0, maxY = 0;
    layoutedGraph.children?.forEach((node) => {
      const nodeX = (node.x || 0) + (node.width || 0);
      const nodeY = (node.y || 0) + (node.height || 0);
      maxX = Math.max(maxX, nodeX);
      maxY = Math.max(maxY, nodeY);
    });

    // Fixed generous padding to ensure nothing is cut off
    const horizontalPadding = 120;
    const verticalPadding = 120;

    // Map back to React Flow nodes with explicit dimensions
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      const dimensions = nodeDimensions.get(node.id)!;

      return {
        ...node,
        position: {
          x: (elkNode?.x || 0) + horizontalPadding,
          y: (elkNode?.y || 0) + verticalPadding,
        },
        // Set explicit dimensions so React Flow uses our calculated sizes
        style: {
          ...(node.style || {}),
          width: dimensions.width,
          height: dimensions.height,
        },
        // Store dimensions in data for reference
        data: {
          ...node.data,
          calculatedWidth: dimensions.width,
          calculatedHeight: dimensions.height,
        },
      };
    });

    console.log('ELK: Enhanced layout complete for', layoutedNodes.length, 'nodes');
    console.log('ELK: Diagram bounds - width:', maxX + horizontalPadding * 2, 'height:', maxY + verticalPadding * 2);

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

