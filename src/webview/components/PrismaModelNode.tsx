import React, { useMemo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

export interface PrismaField {
  name: string;
  type: string;
  isId: boolean;
  isUnique: boolean;
  isRequired: boolean;
  isList: boolean;
  hasDefault: boolean;
  isForeignKey: boolean;
  relationToModel?: string;
  isEnum: boolean;
}

export interface PrismaModelNodeData {
  label: string;
  fields: PrismaField[];
  color?: 'yellow' | 'red' | 'teal';
  group?: string;
}

const PrismaModelNode: React.FC<NodeProps<PrismaModelNodeData>> = ({
  data,
  selected,
}) => {
  // Color mapping for header bars
  const colorClasses = {
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
  };

  const headerClass = colorClasses[data.color || 'yellow'];

  // Calculate handle positions for each relation field
  const relationFields = useMemo(() => {
    return data.fields.filter(f => f.relationToModel || f.isForeignKey);
  }, [data.fields]);

  const getHandlePosition = (index: number, total: number) => {
    if (total === 1) return '50%';
    const step = 100 / (total + 1);
    return `${step * (index + 1)}%`;
  };

  return (
    <div style={{ padding: 0, margin: 0, background: "transparent" }} className="relative">
      {/* Header */}
      <div
        className={`${headerClass} text-white px-4 py-3 ${selected ? "ring-2 ring-white ring-offset-2" : ""}`}
      >
        <div className="font-bold text-lg uppercase">{data.label}</div>
        <div className="text-xs opacity-80">Model</div>
      </div>

      {/* Fields */}
      <div className="bg-gray-900">
        {data.fields.map((field, index) => (
          <div
            key={field.name}
            className={`flex items-center justify-between px-4 py-2 border-b border-gray-700 last:border-b-0 relative min-w-0 ${
              index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
              {/* Indicators */}
              <div className="flex gap-1 flex-shrink-0">
                {field.isId && (
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                    PK
                  </span>
                )}
                {field.isForeignKey && (
                  <span className="text-xs font-bold text-blue-400 bg-blue-400/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                    FK
                  </span>
                )}
                {field.relationToModel && !field.isForeignKey && (
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-400/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                    Rel
                  </span>
                )}
                {field.isUnique && !field.isId && (
                  <span className="text-xs font-bold text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                    U
                  </span>
                )}
              </div>
            </div>

            {/* Field name */}
            <span
              className={`text-sm font-medium truncate flex-1 min-w-0 ${
                field.isRequired ? "text-white" : "text-gray-400"
              }`}
              title={field.name}
            >
              {field.name}
            </span>

            {/* Type */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span
                className="text-xs text-gray-400 font-mono whitespace-nowrap"
                title={`${field.type}${field.isList ? "[]" : ""}${field.isRequired ? "" : "?"}`}
              >
                {field.type}
                {field.isList && "[]"}
                {field.isRequired ? "" : "?"}
              </span>
            </div>

            {/* Handle for relation fields */}
            {field.relationToModel && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className="w-2 h-2 !bg-white !border-0 !rounded-full flex-shrink-0"
                style={{ top: '50%', right: '-4px' }}
              />
            )}
            {field.isForeignKey && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className="w-2 h-2 !bg-blue-400 !border-0 !rounded-full flex-shrink-0"
                style={{ top: '50%', left: '-4px' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Default handles for backward compatibility */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-white" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-white" />
    </div>
  );
};

export default PrismaModelNode;
