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
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { parsePrismaSchema, convertPrismaToFlowChart, PrismaSchema } from './prismaParser';
import { parseYamlSchema } from './yamlParser';
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

  // Register custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    prismaModel: PrismaModelNode,
    prismaEnum: PrismaEnumNode,
  }), []);

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
        const schema = parseYamlSchema(initialData.yamlSchema);
        currentSchemaRef.current = schema;
        setSchemaType('yaml');
        setSchemaName('YAML Schema');
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
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="w-screen h-screen bg-[#1E1E1E]">
      {isPrisma && (
        <div className="absolute top-4 left-4 z-10 bg-gray-800 px-4 py-3 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-sm font-bold text-gray-200 mb-1">🔷 {schemaName || 'Schema Visualization'}</h2>
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
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#ffffff', strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
        <Controls className="!bg-gray-800 !border-gray-700 [&>button]:!bg-gray-700 [&>button]:!border-gray-600 [&>button]:!text-white [&>button:hover]:!bg-gray-600" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            if (data.color === 'yellow') return '#f59e0b';
            if (data.color === 'red') return '#ef4444';
            if (data.color === 'teal') return '#14b8a6';
            return '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  );
};

export default App;
