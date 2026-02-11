import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { parsePrismaSchema, convertPrismaToFlowChart, PrismaSchema } from './prismaParser';
import { parseYamlSchema, parseYamlDiagram } from './yamlParser';
import { prismaToYaml } from './yamlTransformer';
import PrismaModelNode from './components/PrismaModelNode';
import PrismaEnumNode from './components/PrismaEnumNode';
import { StartNode, EndNode, ProcessNode, DecisionNode, NoteNode } from './components/FlowNodes';
import SequenceDiagramD3 from './components/SequenceDiagramD3';
import { layoutFlowDiagram } from './elkLayout';

// Declare the vscode API
declare global {
  interface Window {
    vscodeInitialData?: {
      type: string;
      prismaSchema?: string | null;
      yamlSchema?: string | null;
      filePath?: string;
    };
    vscode?: any;
  }
}

const vscode = window.vscode;

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Process' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    data: { label: 'Decision' },
    position: { x: 400, y: 125 },
  },
  {
    id: '4',
    type: 'output',
    data: { label: 'End' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-4', source: '2', target: '4', label: 'yes' },
  { id: 'e3-4', source: '3', target: '4', label: 'no' },
];

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isPrisma, setIsPrisma] = useState(false);
  const [schemaType, setSchemaType] = useState<'prisma' | 'yaml' | null>(null);
  const [diagramKind, setDiagramKind] = useState<'erd' | 'flow' | 'sequence' | null>(null);
  const [schemaName, setSchemaName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isAutoLayouting, setIsAutoLayouting] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'DOWN' | 'RIGHT'>('DOWN');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutSaveMessage, setLayoutSaveMessage] = useState<string>('');
  const currentSchemaRef = useRef<PrismaSchema | null>(null);

  // Track selected field for highlighting (ERD)
  const [selectedField, setSelectedField] = useState<{ modelName: string; fieldName: string } | null>(null);

  // Track selected model for highlighting all related models (ERD)
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Track selected flow node for highlighting (Flow diagrams)
  const [selectedFlowNode, setSelectedFlowNode] = useState<string | null>(null);

  // Track selected edge for highlighting (Flow diagrams)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);

  // Determine which edges should be highlighted based on selected field, model, node, or edge
  const highlightedEdges = useMemo(() => {
    const highlighted = new Set<string>();

    // If an edge is selected, highlight it
    if (selectedEdge) {
      highlighted.add(selectedEdge);
      return highlighted;
    }

    // Flow diagram: highlight edges connected to selected node
    if (selectedFlowNode) {
      // Find all edges that connect to/from the selected node
      edges.forEach(edge => {
        if (edge.source === selectedFlowNode || edge.target === selectedFlowNode) {
          highlighted.add(edge.id);
        }
      });
      return highlighted;
    }

    // ERD: If a model is selected, highlight all its relationships
    if (selectedModel) {
      const model = currentSchemaRef.current?.models.find(m => m.name === selectedModel);
      if (!model) return highlighted;

      // Find all fields in this model that have relations
      for (const field of model.fields) {
        if (field.relationToModel) {
          const edgeId = `${model.name}-${field.name}-${field.relationToModel}`;
          highlighted.add(edgeId);
        }
      }

      // Find all fields in other models that reference this model
      if (currentSchemaRef.current) {
        for (const otherModel of currentSchemaRef.current.models) {
          for (const otherField of otherModel.fields) {
            if (otherField.relationToModel === selectedModel) {
              const edgeId = `${otherModel.name}-${otherField.name}-${selectedModel}`;
              highlighted.add(edgeId);
            }
          }
        }
      }

      return highlighted;
    }

    // ERD: If a field is selected, highlight its specific relationship
    if (!selectedField) return highlighted;

    const { modelName, fieldName } = selectedField;

    // Get the selected field data
    const model = currentSchemaRef.current?.models.find(m => m.name === modelName);
    if (!model) return highlighted;

    const field = model.fields.find(f => f.name === fieldName);
    if (!field) return highlighted;

    // If field has a relation (FK or virtual), add the edge
    if (field.relationToModel) {
      // Edge ID format: `${modelName}-${fieldName}-${targetModelName}`
      const edgeId = `${modelName}-${fieldName}-${field.relationToModel}`;
      highlighted.add(edgeId);
    }

    // Also check if any field in other models references this field
    if (currentSchemaRef.current) {
      for (const otherModel of currentSchemaRef.current.models) {
        for (const otherField of otherModel.fields) {
          if (otherField.relationToModel === modelName) {
            // Check if this relation points to our selected field
            if (otherField.isForeignKey && otherField.referencesField === fieldName) {
              // This field's FK points to our selected field
              const edgeId = `${otherModel.name}-${otherField.name}-${modelName}`;
              highlighted.add(edgeId);
            }
            // Virtual relation to an ID field
            if (!otherField.isForeignKey && field.isId) {
              const edgeId = `${otherModel.name}-${otherField.name}-${modelName}`;
              highlighted.add(edgeId);
            }
          }
        }
      }
    }

    return highlighted;
  }, [selectedField, selectedModel, selectedFlowNode, selectedEdge, edges]);

  // Determine which models should be highlighted based on selection
  const highlightedModels = useMemo(() => {
    const highlighted = new Set<string>();

    if (selectedModel) {
      // Add the selected model
      highlighted.add(selectedModel);

      // Add all related models
      const model = currentSchemaRef.current?.models.find(m => m.name === selectedModel);
      if (model && currentSchemaRef.current) {
        for (const field of model.fields) {
          if (field.relationToModel) {
            highlighted.add(field.relationToModel);
          }
        }

        // Find models that reference this model
        for (const otherModel of currentSchemaRef.current.models) {
          for (const otherField of otherModel.fields) {
            if (otherField.relationToModel === selectedModel) {
              highlighted.add(otherModel.name);
            }
          }
        }
      }
    }

    // If a field is selected, also highlight its model
    if (selectedField) {
      highlighted.add(selectedField.modelName);

      // Also highlight the related model
      const model = currentSchemaRef.current?.models.find(m => m.name === selectedField.modelName);
      if (model) {
        const field = model.fields.find(f => f.name === selectedField.fieldName);
        if (field?.relationToModel) {
          highlighted.add(field.relationToModel);
        }
      }
    }

    return highlighted;
  }, [selectedModel, selectedField]);

  // Determine which flow nodes should be highlighted based on selection
  const highlightedFlowNodes = useMemo(() => {
    const highlighted = new Set<string>();

    // If an edge is selected, highlight its source and target nodes
    if (selectedEdge) {
      const edge = edges.find(e => e.id === selectedEdge);
      if (edge) {
        highlighted.add(edge.source);
        highlighted.add(edge.target);
      }
      return highlighted;
    }

    if (!selectedFlowNode) return highlighted;

    // Add the selected node itself
    highlighted.add(selectedFlowNode);

    // Find all connected nodes (incoming and outgoing)
    edges.forEach(edge => {
      if (edge.source === selectedFlowNode) {
        highlighted.add(edge.target); // Outgoing connection
      }
      if (edge.target === selectedFlowNode) {
        highlighted.add(edge.source); // Incoming connection
      }
    });

    return highlighted;
  }, [selectedFlowNode, selectedEdge, edges]);

  // Register custom node types with props
  const nodeTypes: NodeTypes = useMemo(() => ({
    prismaModel: (props) => (
      <PrismaModelNode
        {...props}
        selectedField={selectedField}
        onFieldClick={(field) => {
          setSelectedField(field);
          setSelectedModel(null); // Clear model selection when field is clicked
        }}
        selectedModel={selectedModel}
        onModelClick={(modelName) => {
          setSelectedModel(modelName);
          setSelectedField(null); // Clear field selection when model is clicked
        }}
        highlightedModels={highlightedModels}
      />
    ),
    prismaEnum: PrismaEnumNode,
    // Flow diagram nodes - wrapped with click handlers and highlight state
    start: (props) => (
      <StartNode
        {...props}
        isSelected={selectedFlowNode === props.id}
        highlighted={highlightedFlowNodes.has(props.id)}
        onClick={() => {
          setSelectedFlowNode(props.id === selectedFlowNode ? null : props.id);
          // Clear other selections
          setSelectedField(null);
          setSelectedModel(null);
          setSelectedEdge(null);
        }}
      />
    ),
    end: (props) => (
      <EndNode
        {...props}
        isSelected={selectedFlowNode === props.id}
        highlighted={highlightedFlowNodes.has(props.id)}
        onClick={() => {
          setSelectedFlowNode(props.id === selectedFlowNode ? null : props.id);
          // Clear other selections
          setSelectedField(null);
          setSelectedModel(null);
          setSelectedEdge(null);
        }}
      />
    ),
    process: (props) => (
      <ProcessNode
        {...props}
        isSelected={selectedFlowNode === props.id}
        highlighted={highlightedFlowNodes.has(props.id)}
        onClick={() => {
          setSelectedFlowNode(props.id === selectedFlowNode ? null : props.id);
          // Clear other selections
          setSelectedField(null);
          setSelectedModel(null);
          setSelectedEdge(null);
        }}
      />
    ),
    decision: (props) => (
      <DecisionNode
        {...props}
        isSelected={selectedFlowNode === props.id}
        highlighted={highlightedFlowNodes.has(props.id)}
        onClick={() => {
          setSelectedFlowNode(props.id === selectedFlowNode ? null : props.id);
          // Clear other selections
          setSelectedField(null);
          setSelectedModel(null);
          setSelectedEdge(null);
        }}
      />
    ),
    note: (props) => (
      <NoteNode
        {...props}
        isSelected={selectedFlowNode === props.id}
        highlighted={highlightedFlowNodes.has(props.id)}
        onClick={() => {
          setSelectedFlowNode(props.id === selectedFlowNode ? null : props.id);
          // Clear other selections
          setSelectedField(null);
          setSelectedModel(null);
          setSelectedEdge(null);
        }}
      />
    ),
    // Sequence diagram node
    sequenceDiagram: SequenceDiagramD3,
  }), [selectedField, selectedModel, highlightedModels, selectedFlowNode, highlightedFlowNodes, selectedEdge]);

  // Register custom edge types (sequence diagrams don't use edges)
  const edgeTypes: EdgeTypes = useMemo(() => ({}), []);

  // Update edges with highlighting styles
  const styledEdges = useMemo(() => {
    return edges.map(edge => {
      const isHighlighted = highlightedEdges.has(edge.id);

      // Get the source model's color for highlighting
      const getSourceModelColor = () => {
        const sourceModel = currentSchemaRef.current?.models.find(m => m.name === edge.source);
        const colorMap: { [key: string]: string } = {
          yellow: '#f59e0b',
          red: '#ef4444',
          teal: '#14b8a6',
        };
        return colorMap[sourceModel?.color || 'yellow'];
      };

      const highlightColor = getSourceModelColor();

      return {
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: isHighlighted ? 4 : 1.5,
          stroke: isHighlighted ? highlightColor : (edge.style?.stroke || '#64748b'),
        },
        animated: isHighlighted,
        zIndex: isHighlighted ? 10000 : -1000,
        markerEnd: isHighlighted ? {
          type: MarkerType.ArrowClosed,
          color: highlightColor,
          width: 12,
          height: 12,
        } : undefined,
      };
    });
  }, [edges, highlightedEdges]);

  // Load schema from initial data (Prisma or YAML)
  useEffect(() => {
    const initialData = window.vscodeInitialData;
    if (!initialData) return;

    // Handle Prisma schema
    if (initialData.prismaSchema) {
      try {
        setIsLoading(true);
        const schema = parsePrismaSchema(initialData.prismaSchema);
        currentSchemaRef.current = schema;
        setSchemaType('prisma');
        setSchemaName('Prisma Schema');
        convertPrismaToFlowChart(schema).then(({ nodes: prismaNodes, edges: prismaEdges }) => {
          setNodes(prismaNodes);
          setEdges(prismaEdges);
          setIsPrisma(true);
          setIsLoading(false);
        }).catch((error) => {
          console.error('Error applying ELK layout:', error);
          // Fallback to sync layout
          const { convertPrismaToFlowChartSync } = require('./prismaParser');
          const { nodes: prismaNodes, edges: prismaEdges } = convertPrismaToFlowChartSync(schema);
          setNodes(prismaNodes);
          setEdges(prismaEdges);
          setIsPrisma(true);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error parsing Prisma schema:', error);
      }
    }

    // Handle YAML schema
    if (initialData.yamlSchema) {
      try {
        // Use parseYamlDiagram to get the raw parsed data with diagram_type
        const parsed = parseYamlDiagram(initialData.yamlSchema);
        const diagramType = parsed.diagram_type || 'erd';

        console.log('Diagram type:', diagramType);

        if (diagramType === 'erd') {
          // Handle ERD diagrams (original YAML/Prisma format)
          setIsLoading(true);
          const schema = parseYamlSchema(initialData.yamlSchema);
          currentSchemaRef.current = schema;
          setSchemaType('yaml');
          setDiagramKind('erd');
          setSchemaName('YAML Schema (ERD)');
          convertPrismaToFlowChart(schema).then(({ nodes: prismaNodes, edges: prismaEdges }) => {
            setNodes(prismaNodes);
            setEdges(prismaEdges);
            setIsPrisma(true);
            setIsLoading(false);
          }).catch((error) => {
            console.error('Error applying ELK layout:', error);
            const { convertPrismaToFlowChartSync } = require('./prismaParser');
            const { nodes: prismaNodes, edges: prismaEdges } = convertPrismaToFlowChartSync(schema);
            setNodes(prismaNodes);
            setEdges(prismaEdges);
            setIsPrisma(true);
            setIsLoading(false);
          });
        } else if (diagramType === 'flow') {
          // Handle flow diagrams
          const { parseFlowYaml, convertFlowToReactFlow } = require('./parsers/flowParser');
          const flowSchema = parseFlowYaml(initialData.yamlSchema);

          setSchemaType('yaml');
          setDiagramKind('flow');
          setSchemaName(`Flow: ${flowSchema.metadata.name}`);
          setIsLoading(true);

          // Request saved layout from extension before loading
          vscode?.postMessage({
            command: 'getSavedLayout',
            filePath: initialData.filePath || '',
          });

          convertFlowToReactFlow(flowSchema).then(({ nodes: flowNodes, edges: flowEdges }: { nodes: Node[]; edges: Edge[] }) => {
            setNodes(flowNodes);
            setEdges(flowEdges);
            setIsPrisma(false);
            setIsLoading(false);
          }).catch((error: unknown) => {
            console.error('Error applying flow layout:', error);
            setIsLoading(false);
          });
        } else if (diagramType === 'sequence') {
          // Handle sequence diagrams - use React Flow
          const { parseSequenceYaml, convertSequenceToReactFlow } = require('./parsers/sequenceParser');
          const sequenceSchema = parseSequenceYaml(initialData.yamlSchema);

          setSchemaType('yaml');
          setDiagramKind('sequence');
          setSchemaName(`Sequence: ${sequenceSchema.metadata.name}`);

          convertSequenceToReactFlow(sequenceSchema).then(({ nodes: sequenceNodes, edges: sequenceEdges }: { nodes: Node[]; edges: Edge[] }) => {
            setNodes(sequenceNodes);
            setEdges(sequenceEdges);
            setIsPrisma(false);
          }).catch((error: unknown) => {
            console.error('Error applying sequence layout:', error);
          });
        }
      } catch (error) {
        console.error('Error parsing YAML schema:', error);
      }
    }
  }, []);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('Webview received message:', message.command, message);

      if (message.command === 'savedLayoutLoaded') {
        // Apply saved layout to nodes and edges
        console.log('Applying saved layout:', message.layout);
        const { nodes: savedNodes, edges: savedEdges, direction } = message.layout;

        // Apply saved positions to nodes
        setNodes((currentNodes) => {
          return currentNodes.map((node) => {
            const savedNode = savedNodes.find((n: any) => n.id === node.id);
            if (savedNode) {
              return {
                ...node,
                position: savedNode.position,
              };
            }
            return node;
          });
        });

        // Apply saved edge connection points and routing
        setEdges((currentEdges) => {
          return currentEdges.map((edge) => {
            const savedEdge = savedEdges.find((e: any) => e.id === edge.id);
            if (savedEdge) {
              return {
                ...edge,
                sourceHandle: savedEdge.sourceHandle,
                targetHandle: savedEdge.targetHandle,
                // Restore edge routing data if available
                ...(savedEdge.data && { data: savedEdge.data }),
                ...(savedEdge.style && { style: savedEdge.style }),
                ...(savedEdge.label && { label: savedEdge.label }),
                ...(savedEdge.type && { type: savedEdge.type }),
              };
            }
            return edge;
          });
        });

        // Set layout direction from saved layout
        if (direction) {
          setLayoutDirection(direction);
        }

        console.log('✅ Saved layout applied');
        setIsLoading(false);
      } else if (message.command === 'noSavedLayout') {
        console.log('No saved layout found, using default');
        setIsLoading(false);
      } else if (message.command === 'saveAsYaml' && currentSchemaRef.current) {
        setIsSaving(true);
        setSaveMessage('Converting to YAML...');

        // Convert current schema to YAML and send back to extension
        try {
          const yaml = prismaToYaml(currentSchemaRef.current, {
            name: schemaName,
            description: 'Generated from Prisma schema',
          });
          setSaveMessage('Saving...');
          vscode?.postMessage({
            command: 'saveYaml',
            data: yaml,
            filePath: message.filePath,
          });
        } catch (error) {
          console.error('Error converting to YAML:', error);
          setSaveMessage(`Error: ${error}`);
          setIsSaving(false);

          // Clear error message after 3 seconds
          setTimeout(() => setSaveMessage(''), 3000);
        }
      }

      if (message.command === 'saveCancelled') {
        setIsSaving(false);
        setSaveMessage('');
      }

      if (message.command === 'saveComplete') {
        setIsSaving(false);
        setSaveMessage('✓ Saved successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      }

      if (message.command === 'saveError') {
        setIsSaving(false);
        setSaveMessage(`✗ Failed: ${message.error}`);

        // Clear error message after 5 seconds
        setTimeout(() => setSaveMessage(''), 5000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [schemaName]);

  const handleSaveAsYaml = () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage('Opening save dialog...');
    console.log('Sending requestSaveYaml to extension', vscode);
    // Request the extension to show save dialog
    vscode?.postMessage({ command: 'requestSaveYaml' });
  };

  const handleAutoLayout = async () => {
    if (isAutoLayouting) return;
    if (diagramKind !== 'flow') {
      console.log('Auto-layout is only available for flow diagrams');
      return;
    }

    setIsAutoLayouting(true);
    console.log(`🔄 Starting auto-layout (${layoutDirection === 'DOWN' ? 'Top-Down' : 'Left-Right'})...`);

    try {
      const result = await layoutFlowDiagram(nodes, edges, layoutDirection);
      setNodes(result.nodes);
      setEdges(result.edges);
      console.log('✅ Auto-layout complete!');
    } catch (error) {
      console.error('❌ Auto-layout failed:', error);
    } finally {
      setIsAutoLayouting(false);
    }
  };

  const handleSaveLayout = async () => {
    if (isSavingLayout) return;

    setIsSavingLayout(true);
    setLayoutSaveMessage('Saving layout...');

    try {
      // Create layout data with node positions, edge connection points, and edge routing
      const layoutData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        direction: layoutDirection,
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          // Store edge routing information (bend points, etc.)
          data: edge.data,
          style: edge.style,
          label: edge.label,
          type: edge.type,
        })),
      };

      // Send to extension to save to YAML file
      vscode?.postMessage({
        command: 'saveLayout',
        filePath: window.vscodeInitialData?.filePath || '',
        data: layoutData,
      });

      console.log('💾 Layout saved to YAML file:', layoutData);
      setLayoutSaveMessage('✓ Layout saved to file!');

      // Clear message after 3 seconds
      setTimeout(() => setLayoutSaveMessage(''), 3000);
    } catch (error) {
      console.error('❌ Failed to save layout:', error);
      setLayoutSaveMessage('✗ Failed to save');
      setTimeout(() => setLayoutSaveMessage(''), 3000);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Prevent creating new connections - only allow updating existing edges
      console.log('New connection attempted (blocked):', connection);
      // Do NOT add the new edge - this prevents creating new connections
      // Users can only re-route existing edges via drag-and-drop
      return;
    },
    []
  );

  const onEdgeUpdateStart = useCallback(() => {
    console.log('Edge update started');
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      console.log('Edge updated:', oldEdge, '->', newConnection);
      setEdges((eds) => {
        const index = eds.findIndex((e) => e.id === oldEdge.id);
        if (index === -1) return eds;

        const updatedEdge = {
          ...eds[index],
          source: newConnection.source || oldEdge.source,
          target: newConnection.target || oldEdge.target,
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
        };

        const newEdges = [...eds];
        newEdges[index] = updatedEdge;
        return newEdges;
      });
    },
    [setEdges]
  );

  return (
    <div className="w-screen h-screen bg-[#1e1e1e]">
      {(isPrisma || schemaType === 'yaml') && (
        <div className="absolute top-4 left-4 z-10 bg-[#2d2d2d] px-4 py-3 rounded-lg shadow-sm border border-gray-700">
          <h2 className="text-sm font-bold text-gray-100 mb-1">🔷 {schemaName || 'Schema Visualization'}</h2>
          {diagramKind === 'sequence' ? (
            <p className="text-xs text-gray-400">
              {Object.keys(nodes[0]?.data?.participants || {}).length} participants, {nodes[0]?.data?.messages?.length || 0} messages
            </p>
          ) : isPrisma ? (
            <>
              <p className="text-xs text-gray-400">
                {nodes.length} items ({nodes.filter(n => n.type === 'prismaModel').length} models, {nodes.filter(n => n.type === 'prismaEnum').length} enums)
              </p>
              <p className="text-xs text-gray-400 mt-1">{edges.length} relations</p>
              <div className="mt-2 pt-2 border-t border-gray-700 flex gap-2 text-xs flex-wrap items-center">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded"></span>
                  <span className="text-gray-300">PK</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded"></span>
                  <span className="text-gray-300">FK</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded"></span>
                  <span className="text-gray-300">Unique</span>
                </span>
                {schemaType === 'prisma' && (
                  <>
                    <button
                      onClick={handleSaveAsYaml}
                      disabled={isSaving}
                      className={`ml-auto px-2 py-1 text-white text-xs rounded ${
                        isSaving
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        'Save as YAML'
                      )}
                    </button>
                    {saveMessage && (
                      <span className={`text-xs ${saveMessage.startsWith('✓') ? 'text-green-400' : saveMessage.startsWith('✗') ? 'text-red-400' : 'text-gray-300'}`}>
                        {saveMessage}
                      </span>
                    )}
                  </>
                )}
              </div>
            </>
          ) : diagramKind === 'flow' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-400">
                {nodes.length} nodes, {edges.length} edges
              </p>
              <button
                onClick={() => setLayoutDirection(layoutDirection === 'DOWN' ? 'RIGHT' : 'DOWN')}
                className={`px-2 py-1 text-white text-xs rounded ${
                  layoutDirection === 'DOWN'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                title={`Switch to ${layoutDirection === 'DOWN' ? 'Left-Right' : 'Top-Down'} layout`}
              >
                {layoutDirection === 'DOWN' ? '⬇️ Top-Down' : '➡️ Left-Right'}
              </button>
              <button
                onClick={handleAutoLayout}
                disabled={isAutoLayouting}
                className={`px-2 py-1 text-white text-xs rounded ${
                  isAutoLayouting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isAutoLayouting ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Layouting...
                  </span>
                ) : (
                  '🔄 Auto Layout'
                )}
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={isSavingLayout}
                className={`px-2 py-1 text-white text-xs rounded ${
                  isSavingLayout
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSavingLayout ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  '💾 Save Layout'
                )}
              </button>
              {layoutSaveMessage && (
                <span className={`text-xs ${layoutSaveMessage.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {layoutSaveMessage}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {nodes.length} nodes, {edges.length} edges
            </p>
          )}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdate={onEdgeUpdate}
        connectionMode={ConnectionMode.Loose}
        onEdgeClick={(event, edge) => {
          setSelectedEdge(edge.id === selectedEdge ? null : edge.id);
          // Clear other selections
          setSelectedFlowNode(null);
          setSelectedField(null);
          setSelectedModel(null);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.25,
          includeHiddenNodes: false,
          minZoom: 0.2,
          maxZoom: 1.2,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#1e1e1e' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#4b5563" />
        <Controls className="!bg-[#2d2d2d] !border-gray-700 [&>button]:!bg-gray-700 [&>button]:!border-gray-600 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-600" />
      </ReactFlow>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#1e1e1e] bg-opacity-90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-300 text-lg">Calculating optimal layout...</p>
            <p className="text-gray-500 text-sm">This may take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
