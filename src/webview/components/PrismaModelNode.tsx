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
  referencesField?: string;  // Which field this FK references (e.g., "id")
  isEnum: boolean;
}

export interface PrismaModelNodeData {
  label: string;
  fields: PrismaField[];
  color?: 'yellow' | 'red' | 'teal';
  group?: string;
}

interface PrismaModelNodeProps extends NodeProps<PrismaModelNodeData> {
  selectedField?: { modelName: string; fieldName: string } | null;
  onFieldClick?: (field: { modelName: string; fieldName: string } | null) => void;
  selectedModel?: string | null;
  onModelClick?: (modelName: string | null) => void;
  highlightedModels?: Set<string>;
}

const PrismaModelNode: React.FC<PrismaModelNodeProps> = ({
  data,
  selected,
  selectedField,
  onFieldClick,
  selectedModel,
  onModelClick,
  highlightedModels,
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

  // Determine if a field should be highlighted
  const isFieldHighlighted = (field: PrismaField): boolean => {
    if (!selectedField) return false;

    // This is the selected field
    if (selectedField.modelName === data.label && selectedField.fieldName === field.name) {
      return true;
    }

    // Find the selected field in the schema
    const selectedFieldData = data.fields.find(f => f.name === selectedField.fieldName);

    // If the selected field is in this model
    if (selectedField.modelName === data.label && selectedFieldData) {
      // Highlight foreign key reference field
      if (selectedFieldData.isForeignKey && selectedFieldData.referencesField === field.name) {
        return true;
      }
      // Highlight virtual relation target
      if (!selectedFieldData.isForeignKey && selectedFieldData.relationToModel && field.isId) {
        return true;
      }
    }

    // If the selected field is in another model, check if this field relates to it
    if (selectedField.modelName !== data.label) {
      // This field is a FK that references the selected field
      if (field.isForeignKey &&
          field.relationToModel === selectedField.modelName &&
          field.referencesField === selectedField.fieldName) {
        return true;
      }
      // This field is the ID referenced by the selected field's FK
      if (field.isId && selectedFieldData?.isForeignKey &&
          selectedFieldData.relationToModel === data.label &&
          selectedFieldData.referencesField === field.name) {
        return true;
      }
      // This field is a virtual relation to the selected model
      if (!field.isForeignKey && field.relationToModel === selectedField.modelName && field.isId) {
        return true;
      }
    }

    return false;
  };

  const handleFieldClick = (fieldName: string) => {
    if (onFieldClick) {
      // Toggle selection
      if (selectedField?.modelName === data.label && selectedField?.fieldName === fieldName) {
        onFieldClick(null);
      } else {
        onFieldClick({ modelName: data.label, fieldName });
      }
    }
  };

  const isModelHighlighted = highlightedModels?.has(data.label) || false;
  const isModelSelected = selectedModel === data.label;

  // Get the highlight color based on model color (66% opacity for outer ring, solid for fields)
  const getHighlightColor = (opacity = 0.66) => {
    const colorMap: { [key: string]: string } = {
      yellow: `rgba(245, 158, 11, ${opacity})`,  // #f59e0b
      red: `rgba(239, 68, 68, ${opacity})`,     // #ef4444
      teal: `rgba(20, 184, 166, ${opacity})`,   // #14b8a6
    };
    return colorMap[data.color || 'yellow'];
  };

  const getModelColorHex = () => {
    const colorMap: { [key: string]: string } = {
      yellow: '#f59e0b',
      red: '#ef4444',
      teal: '#14b8a6',
    };
    return colorMap[data.color || 'yellow'];
  };

  return (
    <div
      className={`relative transition-all ${isModelHighlighted ? 'ring-4' : ''}`}
      style={{
        padding: 0,
        margin: 0,
        background: "transparent",
        borderRadius: '8px',
        overflow: 'hidden',
        ...(isModelHighlighted ? { boxShadow: `0 0 0 4px ${getHighlightColor()}` } : {}),
      }}
    >
      {/* Header */}
      <div
        onClick={() => onModelClick && onModelClick(isModelSelected ? null : data.label)}
        className={`${headerClass} text-white px-4 py-3 cursor-pointer transition-all ${
          isModelSelected ? "bg-opacity-80 brightness-110" : ""
        } ${
          isModelHighlighted && !isModelSelected ? "bg-opacity-90" : ""
        }`}
        style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      >
        <div className="font-bold text-lg uppercase">{data.label}</div>
        <div className="text-xs opacity-80">Model</div>
      </div>

      {/* Fields */}
      <div className="bg-gray-900" style={{ borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
        {data.fields.map((field, index) => {
          const highlighted = isFieldHighlighted(field);
          const isSelected = selectedField?.modelName === data.label && selectedField?.fieldName === field.name;
          const modelColor = getModelColorHex();

          return (
            <div
              key={field.name}
              onClick={() => handleFieldClick(field.name)}
              className={`flex items-center justify-between px-4 py-2 border-b border-gray-700 last:border-b-0 relative min-w-0 cursor-pointer transition-all overflow-visible ${
                index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
              }`}
              style={{
                ...(highlighted && !isSelected ? {
                  boxShadow: `inset 0 0 0 1px ${modelColor}`,
                  backgroundColor: modelColor + '33', // 20% opacity
                } : {}),
                ...(isSelected ? {
                  boxShadow: `inset 0 0 0 2px ${modelColor}`,
                  backgroundColor: modelColor + '4D', // 30% opacity
                } : {}),
              }}
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

            {/* Handles for relations */}
            {/* FK field: source handle on the right (points to referenced field) */}
            {field.isForeignKey && field.relationToModel && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className="w-2 h-2 !bg-blue-400 !border-0 !rounded-full flex-shrink-0"
                style={{ top: '50%', right: '-4px' }}
                title={`References ${field.relationToModel}.${field.referencesField || 'id'}`}
              />
            )}
            {/* Virtual relation field (back-relation): source handle on the right */}
            {!field.isForeignKey && field.relationToModel && field.relationToModel !== data.label && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className="w-2 h-2 !bg-indigo-400 !border-0 !rounded-full flex-shrink-0"
                style={{ top: '50%', right: '-4px' }}
                title={`Relation to ${field.relationToModel}`}
              />
            )}
            {/* ID field: target handle on the left (receives FK connections) */}
            {field.isId && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className="w-2 h-2 !bg-yellow-400 !border-0 !rounded-full flex-shrink-0"
                style={{ top: '50%', left: '-4px' }}
                title="Primary key (receives foreign key references)"
              />
            )}
          </div>
            );
          })}
      </div>
    </div>
  );
};

export default PrismaModelNode;
