import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface FlowNodeData {
  label: string;
  description?: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'note';
  group?: string;
  color?: string;
}

interface FlowNodeProps extends NodeProps<FlowNodeData> {
  isSelected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

// Start Node - Pill shape, green
export const StartNode: React.FC<FlowNodeProps> = ({ data, selected, isSelected, highlighted, onClick }) => {
  return (
    <div
      className={`
        inline-flex rounded-full border-2 transition-all relative flex items-center justify-center cursor-pointer
        ${isSelected ? 'ring-2 ring-offset-2 ring-green-400' : ''}
        ${highlighted ? 'ring-2 ring-offset-2 ring-green-300 ring-opacity-75' : ''}
      `}
      onClick={onClick}
      style={{
        backgroundColor: highlighted ? '#86efac' : '#dcfce7',
        borderColor: '#22c55e',
        color: '#166534',
        padding: '12px 24px',
        opacity: highlighted ? 1 : isSelected ? 1 : 0.9,
      }}
    >
      <div className="text-center">
        <div className="font-bold whitespace-nowrap">{data.label}</div>
        {data.description && (
          <div className="text-xs mt-1 opacity-75 whitespace-nowrap">{data.description}</div>
        )}
      </div>
      {/* Start nodes only output - source handle on bottom */}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" style={{ left: '50%', transform: 'translateX(-50%)' }} />
    </div>
  );
};

// End Node - Pill shape, red
export const EndNode: React.FC<FlowNodeProps> = ({ data, selected, isSelected, highlighted, onClick }) => {
  return (
    <div
      className={`
        inline-flex rounded-full border-2 transition-all relative flex items-center justify-center cursor-pointer
        ${isSelected ? 'ring-2 ring-offset-2 ring-red-400' : ''}
        ${highlighted ? 'ring-2 ring-offset-2 ring-red-300 ring-opacity-75' : ''}
      `}
      onClick={onClick}
      style={{
        backgroundColor: highlighted ? '#fca5a5' : '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b',
        padding: '12px 24px',
        opacity: highlighted ? 1 : isSelected ? 1 : 0.9,
      }}
    >
      <div className="text-center">
        <div className="font-bold whitespace-nowrap">{data.label}</div>
        {data.description && (
          <div className="text-xs mt-1 opacity-75 whitespace-nowrap">{data.description}</div>
        )}
      </div>
      {/* End nodes only input - target handle on top */}
      <Handle type="target" position={Position.Top} className="!bg-red-500" style={{ left: '50%', transform: 'translateX(-50%)' }} />
    </div>
  );
};

// Process Node - Rectangle, blue/custom color
export const ProcessNode: React.FC<FlowNodeProps> = ({ data, selected, isSelected, highlighted, onClick }) => {
  // Convert hex color to rgba for background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const baseColor = data.color || '#3b82f6';
  const bgColor = highlighted ? hexToRgba(baseColor, 0.3) : hexToRgba(baseColor, 0.13);
  const borderColor = baseColor;
  const textColor = baseColor;

  return (
    <div
      className={`
        inline-flex rounded-lg border-2 transition-all relative cursor-pointer
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
        ${highlighted ? 'ring-2 ring-offset-2' : ''}
      `}
      onClick={onClick}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor,
        padding: '12px 16px',
        opacity: highlighted ? 1 : isSelected ? 1 : 0.9,
      }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="font-bold whitespace-nowrap">{data.label}</div>
        {data.description && (
          <div className="text-xs mt-1 opacity-75 whitespace-nowrap">{data.description}</div>
        )}
      </div>

      {/* Process nodes: input from top, output from bottom (standard flow) */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400" style={{ left: '50%', transform: 'translateX(-50%)' }} />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" style={{ left: '50%', transform: 'translateX(-50%)' }} />
    </div>
  );
};

// Decision Node - Diamond, orange
export const DecisionNode: React.FC<FlowNodeProps> = ({ data, selected, isSelected, highlighted, onClick }) => {
  // Calculate size based on content
  const labelLength = data.label?.length || 0;
  const descriptionLength = data.description?.length || 0;

  // Calculate dimensions based on text length
  const getDimensions = () => {
    const minWidth = 140;
    const minHeight = 100;

    // Width calculation: base on label and description length
    const calculatedWidth = Math.max(minWidth, Math.min(200, 120 + Math.max(labelLength, descriptionLength) * 4));

    // Height calculation: taller if there's a description
    const hasDescription = descriptionLength > 0;
    const calculatedHeight = hasDescription ? Math.max(minHeight + 20, 100 + Math.ceil(descriptionLength / 15) * 10) : minHeight;

    return { width: calculatedWidth, height: calculatedHeight };
  };

  const { width, height } = getDimensions();
  const centerX = width / 2;
  const centerY = height / 2;
  const padding = 10;

  // Diamond polygon points: top, right, bottom, left
  const topPoint = `${centerX},${padding}`;
  const rightPoint = `${width - padding},${centerY}`;
  const bottomPoint = `${centerX},${height - padding}`;
  const leftPoint = `${padding},${centerY}`;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onClick={onClick}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* SVG Diamond shape for precise handle alignment */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute"
        style={{
          filter: isSelected ? 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.8))' : highlighted ? 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.6))' : 'none',
        }}
      >
        {/* Diamond polygon - points match handle positions exactly */}
        <polygon
          points={`${topPoint} ${rightPoint} ${bottomPoint} ${leftPoint}`}
          fill={highlighted ? '#fed7aa' : '#ffedd5'}
          stroke="#f97316"
          strokeWidth={highlighted ? '3' : '2'}
        />
      </svg>

      {/* Content - centered */}
      <div
        className="absolute z-10 flex flex-col items-center justify-center pointer-events-none text-center px-4"
        style={{
          maxWidth: `${width * 0.6}px`,
        }}
      >
        <div className="font-bold text-sm leading-tight whitespace-nowrap" style={{ color: '#9a3412' }}>{data.label}</div>
        {data.description && (
          <div className="text-xs opacity-75 leading-tight whitespace-pre-wrap" style={{ color: '#9a3412' }}>{data.description}</div>
        )}
      </div>

      {/* Input handle at top vertex */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !border-2 !border-orange-600"
        style={{ top: `${padding}px`, left: `${centerX}px`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px' }}
      />

      {/* Output handle 1 (yes) - left vertex */}
      <Handle
        type="source"
        position={Position.Left}
        id="yes"
        className="!bg-green-500 !border-2 !border-green-600"
        style={{ top: `${centerY}px`, left: `${padding}px`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px' }}
      />

      {/* Output handle 2 (no) - right vertex */}
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="!bg-red-500 !border-2 !border-red-600"
        style={{ top: `${centerY}px`, left: `${width - padding}px`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px' }}
      />

      {/* Additional handles at bottom vertex for more connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-orange-500 !border-2 !border-orange-600"
        style={{ top: `${height - padding}px`, left: `${centerX}px`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px' }}
      />
    </div>
  );
};

// Note Node - Simple square, yellow
export const NoteNode: React.FC<FlowNodeProps> = ({ data, selected, isSelected, highlighted, onClick }) => {
  return (
    <div
      className={`
        relative inline-block border-2 transition-all shadow-sm rounded cursor-pointer
        ${isSelected ? 'ring-2 ring-offset-2 ring-yellow-400' : ''}
      `}
      onClick={onClick}
      style={{
        backgroundColor: highlighted ? '#fef08a' : '#fef9c3',
        borderColor: '#fbbf24',
        color: '#854d0e',
        padding: '12px 16px 12px 40px',
        opacity: highlighted ? 1 : isSelected ? 1 : 0.9,
      }}
    >
      {/* Note icon */}
      <div className="absolute top-2 left-2 opacity-30">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="font-semibold text-sm leading-tight">{data.label}</div>
        {data.description && (
          <div className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">{data.description}</div>
        )}
      </div>

      {/* Handles - can connect to/from top and bottom */}
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 opacity-50" style={{ left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px' }} />
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 opacity-50" style={{ left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px' }} />
    </div>
  );
};
