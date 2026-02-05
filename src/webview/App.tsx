import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import { parsePrismaSchema, convertPrismaToFlowChart } from './prismaParser';
import PrismaModelNode from './components/PrismaModelNode';
import PrismaEnumNode from './components/PrismaEnumNode';

// Declare the vscode API
declare global {
  interface Window {
    vscodeInitialData?: {
      type: string;
      prismaSchema?: string | null;
    };
  }
}

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

  // Register custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    prismaModel: PrismaModelNode,
    prismaEnum: PrismaEnumNode,
  }), []);

  // Check if we have Prisma schema data
  useEffect(() => {
    const initialData = window.vscodeInitialData;
    if (initialData?.prismaSchema) {
      try {
        const schema = parsePrismaSchema(initialData.prismaSchema);
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
  }, []);

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
          <h2 className="text-sm font-bold text-gray-200 mb-1">🔷 Prisma Schema Visualization</h2>
          <p className="text-xs text-gray-400">
            {nodes.length} items ({nodes.filter(n => n.type === 'prismaModel').length} models, {nodes.filter(n => n.type === 'prismaEnum').length} enums)
          </p>
          <p className="text-xs text-gray-400 mt-1">{edges.length} relations</p>
          <div className="mt-2 pt-2 border-t border-gray-700 flex gap-2 text-xs">
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
