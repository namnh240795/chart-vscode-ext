import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

export interface PrismaEnumNodeData {
  label: string;
  values: { name: string }[];
  color?: 'yellow' | 'red' | 'teal';
  group?: string;
}

const PrismaEnumNode: React.FC<NodeProps<PrismaEnumNodeData>> = ({
  data,
  selected,
}) => {
  // Color mapping for header bars
  const colorClasses = {
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
  };

  const headerClass = colorClasses[data.color || 'teal'];

  return (
    <div style={{ padding: 0, margin: 0, background: "transparent" }}>
      {/* Header */}
      <div
        className={`${headerClass} text-white px-4 py-3 ${selected ? "ring-2 ring-white ring-offset-2" : ""}`}
      >
        <div className="font-bold text-lg uppercase flex items-center gap-2">
          <span>🔷</span>
          <span>{data.label}</span>
        </div>
        <div className="text-xs opacity-80">Enum</div>
      </div>

      {/* Values */}
      <div className="bg-gray-900">
        {data.values.map((value, index) => (
          <div
            key={value.name}
            className={`px-3 py-1.5 text-sm text-gray-300 border-b border-gray-700 last:border-b-0 truncate ${
              index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
            }`}
            title={value.name}
          >
            • {value.name}
          </div>
        ))}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-white" />
    </div>
  );
};

export default PrismaEnumNode;
