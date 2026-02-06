import React, { useMemo } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  BaseEdge,
} from 'reactflow';

/**
 * Flow Edge - Clean React Flow Style
 * Using smooth bezier curves like React Flow examples
 */
export const FlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  style,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = useMemo(() => {
    // Use smooth bezier curves
    const [path] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25,
    });

    const x = (sourceX + targetX) / 2;
    const y = (sourceY + targetY) / 2;

    return [path, x, y];
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  const hasLabel = label && label !== '';

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          strokeWidth: 2,
          stroke: '#b1b1b7',
        }}
        markerEnd={markerEnd}
      />
      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: '12px',
              color: '#64748b',
              backgroundColor: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: '500',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

/**
 * Animated Flow Edge
 */
export const FlowEdgeAnimated: React.FC<EdgeProps> = (props) => {
  return (
    <FlowEdge
      {...props}
      style={{
        strokeWidth: 2,
        stroke: '#8b5cf6',
        strokeDasharray: '5 5',
      }}
    />
  );
};

/**
 * Decision Edge
 */
export const DecisionEdge: React.FC<EdgeProps & { branchType?: 'yes' | 'no' | 'other' }> = ({
  branchType = 'other',
  ...props
}) => {
  return <FlowEdge {...props} />;
};
