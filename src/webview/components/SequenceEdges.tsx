import React, { useMemo } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  BaseEdge,
} from 'reactflow';

// Custom edge for sequence diagrams showing message flow
export const SequenceEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  label,
  style,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = useMemo(() => {
    // Create horizontal line with small vertical drops to/from participants
    const midY = (sourceY + targetY) / 2;

    // Draw horizontal line with slight curve at ends
    const path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;

    const x = (sourceX + targetX) / 2;
    const y = midY;

    return [path, x, y];
  }, [sourceX, sourceY, targetX, targetY]);

  const messageType = data?.messageType || 'sync';
  const isReturn = messageType === 'return';
  const isAsync = messageType === 'async';

  const getEdgeStyle = () => {
    switch (messageType) {
      case 'sync':
        return {
          stroke: '#3b82f6',
          strokeWidth: 2,
        };
      case 'async':
        return {
          stroke: '#8b5cf6',
          strokeWidth: 2,
          animation: 'dash 1s linear infinite',
        };
      case 'return':
        return {
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          strokeDasharray: '5 5',
        };
      default:
        return {
          stroke: '#ffffff',
          strokeWidth: 2,
        };
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={getEdgeStyle()}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {typeof label === 'object' ? (
              label
            ) : (
              <div className="px-2 py-1 bg-gray-700/95 rounded text-white text-xs border border-gray-600 shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{data?.from || ''}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-400">{data?.to || ''}</span>
                  {isAsync && <span className="text-purple-400 ml-1">⚡</span>}
                  {isReturn && <span className="text-gray-500 ml-1">↵</span>}
                </div>
                <div className="font-semibold mt-1">{label}</div>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Solid sync message edge
export const SyncMessageEdge: React.FC<EdgeProps> = (props) => {
  return <SequenceEdge {...props} data={{ ...props.data, messageType: 'sync' }} />;
};

// Async message edge with animation
export const AsyncMessageEdge: React.FC<EdgeProps> = (props) => {
  return <SequenceEdge {...props} data={{ ...props.data, messageType: 'async' }} />;
};

// Return message edge (dashed)
export const ReturnMessageEdge: React.FC<EdgeProps> = (props) => {
  return <SequenceEdge {...props} data={{ ...props.data, messageType: 'return' }} />;
};

// Add CSS animation for animated edges
const style = document.createElement('style');
style.textContent = `
  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }
`;
if (!document.head.querySelector('style[data-sequence-edges]')) {
  style.setAttribute('data-sequence-edges', 'true');
  document.head.appendChild(style);
}
