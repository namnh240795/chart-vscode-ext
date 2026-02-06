import React from 'react';
import { Handle, Position } from 'reactflow';

// Lifeline component - the vertical line for each participant
export const SequenceLifeline: React.FC<any> = ({ data, style }) => {
  const height = style?.height || 600;
  const getBackgroundColor = () => {
    switch (data.type) {
      case 'actor':
        return 'bg-purple-900/30';
      case 'database':
        return 'bg-cyan-900/30';
      default:
        return 'bg-blue-900/30';
    }
  };

  const getBorderColor = () => {
    switch (data.type) {
      case 'actor':
        return 'border-purple-500';
      case 'database':
        return 'border-cyan-500';
      default:
        return 'border-blue-500';
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center ${getBackgroundColor()}`}
      style={{ width: '180px', height: `${height}px`, ...style }}
    >
      {/* Participant header */}
      <div className={`w-full px-4 py-3 border-2 ${getBorderColor()} rounded-t-lg bg-gray-800 text-white text-center`}>
        <div className="text-lg mb-1">{data.type === 'actor' ? '👤' : data.type === 'database' ? '🗄️' : '▢'}</div>
        <div className="font-bold text-sm">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-400 mt-1">{data.description}</div>
        )}
      </div>

      {/* Lifeline (vertical dashed line) */}
      <div className="flex-1 w-px border-l-2 border-dashed border-gray-500 my-2" />

      {/* Invisible handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ visibility: 'hidden' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: 'hidden' }}
      />
    </div>
  );
};

// Message component - displays between lifelines
export const SequenceMessage: React.FC<any> = ({ data }) => {
  const isAsync = data.messageType === 'async';
  const isReturn = data.messageType === 'return';

  const getArrowStyle = () => {
    if (isReturn) {
      return { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5,5' };
    }
    if (isAsync) {
      return { stroke: '#8b5cf6', strokeWidth: 2 };
    }
    return { stroke: '#3b82f6', strokeWidth: 2 };
  };

  return (
    <div className="relative">
      <div className="px-3 py-1.5 bg-gray-700/80 rounded text-white text-xs border border-gray-600 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{data.from}</span>
          <span className="text-gray-500">→</span>
          <span className="text-gray-400">{data.to}</span>
          {isAsync && <span className="text-purple-400 ml-1">⚡</span>}
          {isReturn && <span className="text-gray-500 ml-1">↵</span>}
        </div>
        <div className="font-semibold mt-1">{data.label}</div>
      </div>

      {/* Arrow indicator */}
      <div
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
        style={getArrowStyle()}
      >
        ▼
      </div>

      <Handle
        type="target"
        position={Position.Top}
        style={{ visibility: 'hidden' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: 'hidden' }}
      />
    </div>
  );
};

// Block component (alt, opt, loop, par)
export const SequenceBlock: React.FC<any> = ({ data, style }) => {
  const getBlockStyle = () => {
    switch (data.type) {
      case 'alt':
        return { borderColor: '#f59e0b', bgColor: 'bg-yellow-900/20', label: `alt[${data.condition}]` };
      case 'opt':
        return { borderColor: '#22c55e', bgColor: 'bg-green-900/20', label: `opt[${data.condition}]` };
      case 'loop':
        return { borderColor: '#ef4444', bgColor: 'bg-red-900/20', label: `loop[${data.condition}]` };
      case 'par':
        return { borderColor: '#8b5cf6', bgColor: 'bg-purple-900/20', label: 'par' };
      case 'rect':
        return { borderColor: '#3b82f6', bgColor: 'bg-blue-900/20', label: data.label || '' };
      default:
        return { borderColor: '#6b7280', bgColor: 'bg-gray-900/20', label: data.label || data.type };
    }
  };

  const { borderColor, bgColor, label } = getBlockStyle();

  return (
    <div
      className={`border-2 ${bgColor} rounded-lg p-3 relative`}
      style={{ borderColor, ...style }}
    >
      <div className="text-xs text-white font-semibold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
        {label}
      </div>
      {data.type !== 'rect' && (
        <div className="text-xs text-gray-400 italic">
          {data.messages.length} message(s)
        </div>
      )}
    </div>
  );
};

// Note component
export const SequenceNote: React.FC<any> = ({ data }) => {
  const getPositionClass = () => {
    switch (data.position) {
      case 'left':
        return 'origin-top-right';
      case 'top':
        return 'origin-bottom-center';
      case 'bottom':
        return 'origin-top-center';
      default:
        return 'origin-top-left';
    }
  };

  return (
    <div
      className={`px-4 py-2 bg-yellow-600 border-2 border-yellow-400 rounded-lg text-white text-xs shadow-lg ${getPositionClass()}`}
    >
      <div className="font-bold mb-1 flex items-center gap-1">
        <span>📝</span>
        <span>Note</span>
      </div>
      <div className="text-yellow-50">{data.text}</div>
      {data.attachedTo && data.attachedTo.length > 0 && (
        <div className="mt-2 pt-2 border-t border-yellow-400 text-yellow-200">
          Attached to: {data.attachedTo.join(', ')}
        </div>
      )}
    </div>
  );
};
