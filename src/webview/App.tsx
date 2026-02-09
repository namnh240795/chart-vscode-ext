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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { parsePrismaSchema, convertPrismaToFlowChart, PrismaSchema } from './prismaParser';
import { parseYamlSchema, parseYamlDiagram } from './yamlParser';
import { prismaToYaml } from './yamlTransformer';
import PrismaModelNode from './components/PrismaModelNode';
import PrismaEnumNode from './components/PrismaEnumNode';

// Declare the vscode API
declare global {
  interface Window {
    vscodeInitialData?: {
      type: string;
      prismaSchema?: string | null;
      yamlSchema?: string | null;
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
  const [schemaName, setSchemaName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const currentSchemaRef = useRef<PrismaSchema | null>(null);

  // Track selected field for highlighting
  const [selectedField, setSelectedField] = useState<{ modelName: string; fieldName: string } | null>(null);

  // Track selected model for highlighting all related models
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Determine which edges should be highlighted based on selected field or model
  const highlightedEdges = useMemo(() => {
    const highlighted = new Set<string>();

    // If a model is selected, highlight all its relationships
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

    // If a field is selected, highlight its specific relationship
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
  }, [selectedField, selectedModel]);

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
  }), [selectedField, selectedModel, highlightedModels]);

  // Register custom edge types
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
          stroke: isHighlighted ? highlightColor : (edge.style?.stroke || '#ffffff'),
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
        const schema = parsePrismaSchema(initialData.prismaSchema);
        currentSchemaRef.current = schema;
        setSchemaType('prisma');
        setSchemaName('Prisma Schema');
        convertPrismaToFlowChart(schema).then(({ nodes: prismaNodes, edges: prismaEdges }) => {
          setNodes(prismaNodes);
          setEdges(prismaEdges);
          setIsPrisma(true);
        }).catch((error) => {
          console.error('Error applying ELK layout:', error);
          // Fallback to sync layout
          const { convertPrismaToFlowChartSync } = require('./prismaParser');
          const { nodes: prismaNodes, edges: prismaEdges } = convertPrismaToFlowChartSync(schema);
          setNodes(prismaNodes);
          setEdges(prismaEdges);
          setIsPrisma(true);
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
          const schema = parseYamlSchema(initialData.yamlSchema);
          currentSchemaRef.current = schema;
          setSchemaType('yaml');
          setSchemaName('YAML Schema (ERD)');
          convertPrismaToFlowChart(schema).then(({ nodes: prismaNodes, edges: prismaEdges }) => {
            setNodes(prismaNodes);
            setEdges(prismaEdges);
            setIsPrisma(true);
          }).catch((error) => {
            console.error('Error applying ELK layout:', error);
            const { convertPrismaToFlowChartSync } = require('./prismaParser');
            const { nodes: prismaNodes, edges: prismaEdges } = convertPrismaToFlowChartSync(schema);
            setNodes(prismaNodes);
            setEdges(prismaEdges);
            setIsPrisma(true);
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

      if (message.command === 'saveAsYaml' && currentSchemaRef.current) {
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
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="w-screen h-screen bg-[#f8fafc]">
      {(isPrisma || schemaType === 'yaml') && (
        <div className="absolute top-4 left-4 z-10 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-1">🔷 {schemaName || 'Schema Visualization'}</h2>
          {isPrisma ? (
            <>
              <p className="text-xs text-gray-600">
                {nodes.length} items ({nodes.filter(n => n.type === 'prismaModel').length} models, {nodes.filter(n => n.type === 'prismaEnum').length} enums)
              </p>
              <p className="text-xs text-gray-600 mt-1">{edges.length} relations</p>
              <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2 text-xs flex-wrap items-center">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded"></span>
                  <span className="text-gray-700">PK</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded"></span>
                  <span className="text-gray-700">FK</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded"></span>
                  <span className="text-gray-700">Unique</span>
                </span>
                {schemaType === 'prisma' && (
                  <>
                    <button
                      onClick={handleSaveAsYaml}
                      disabled={isSaving}
                      className={`ml-auto px-2 py-1 text-white text-xs rounded ${
                        isSaving
                          ? 'bg-gray-400 cursor-not-allowed'
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
                      <span className={`text-xs ${saveMessage.startsWith('✓') ? 'text-green-600' : saveMessage.startsWith('✗') ? 'text-red-600' : 'text-gray-700'}`}>
                        {saveMessage}
                      </span>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-600">
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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#b1b1b7', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#f8fafc' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cbd5e1" />
        <Controls className="!bg-white !border-gray-200 [&>button]:!bg-gray-50 [&>button]:!border-gray-200 [&>button]:!text-gray-700 [&>button:hover]:!bg-gray-100" />
      </ReactFlow>
    </div>
  );
};

export default App;
