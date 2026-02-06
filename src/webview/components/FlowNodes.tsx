import React from 'react';
import { Handle, Position } from 'reactflow';

/**
 * Flow Node Component - Clean React Flow Style
 * Based on https://reactflow.dev/learn/concepts/building-a-flow
 */
export const FlowNode: React.FC<any> = ({ data, style: propStyle }) => {
  const getNodeStyle = (): React.CSSProperties => {
    switch (data.type) {
      case 'start':
      case 'end':
        return {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '20px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };

      case 'decision':
        return {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '13px',
          fontWeight: '600',
          transform: 'rotate(45deg)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };

      case 'process':
      default:
        return {
          background: '#ffffff',
          color: '#1f2937',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px 20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        };
    }
  };

  const nodeStyle: React.CSSProperties = {
    ...getNodeStyle(),
    ...(propStyle || {}),
  };

  const isDecision = data.type === 'decision';
  const isStart = data.type === 'start';
  const isEnd = data.type === 'end';
  const isStartOrEnd = isStart || isEnd;

  return (
    <div style={nodeStyle}>
      {!isDecision ? (
        <>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: isStartOrEnd ? '0' : '4px' }}>
              {data.label}
            </div>
            {data.description && !isStartOrEnd && (
              <div style={{ fontSize: '12px', opacity: 0.7, fontWeight: '400' }}>
                {data.description}
              </div>
            )}
          </div>

          {/* Handles */}
          {!isStartOrEnd && (
            <>
              <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
              <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
            </>
          )}
          {isStart && <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />}
          {isEnd && <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />}
        </>
      ) : (
        <>
          {/* Decision node */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '60px',
              minHeight: '60px',
            }}
          >
            <div
              style={{
                transform: 'rotate(-45deg)',
                fontSize: '12px',
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {data.label}
            </div>
          </div>

          {/* Decision handles */}
          <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
          <Handle type="source" position={Position.Right} id="yes" style={{ visibility: 'hidden' }} />
          <Handle type="source" position={Position.Bottom} id="no" style={{ visibility: 'hidden' }} />
          <Handle type="source" position={Position.Left} id="other" style={{ visibility: 'hidden' }} />
        </>
      )}
    </div>
  );
};

/**
 * Flow Group Component
 */
export const FlowGroup: React.FC<any> = ({ data, style }) => {
  return (
    <div
      style={{
        ...style,
        border: '2px dashed #9ca3af',
        backgroundColor: 'rgba(243, 244, 246, 0.5)',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#4b5563',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {data.label}
      </div>
    </div>
  );
};
