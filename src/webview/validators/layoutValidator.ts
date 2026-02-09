/**
 * Layout validator - validates layout constraints (circular deps, reachability, ordering)
 */

import { ValidationError, createError, ErrorCode } from './types';

/**
 * Validate ERD diagram layout
 * Checks for circular foreign key dependencies
 */
export function validateERDLayout(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!diagram.models || typeof diagram.models !== 'object') {
    return errors;
  }

  // Build dependency graph
  const dependencies = new Map<string, string[]>();
  const modelNames = Object.keys(diagram.models);

  for (const modelName of modelNames) {
    dependencies.set(modelName, []);
  }

  for (const [modelName, model] of Object.entries(diagram.models)) {
    const modelObj = model as any;
    if (!modelObj.fields || typeof modelObj.fields !== 'object') {
      continue;
    }

    for (const field of Object.values<any>(modelObj.fields)) {
      if (field && field.attributes && field.attributes.foreign_key && field.attributes.foreign_key.table) {
        const fkTable = field.attributes.foreign_key.table;
        if (modelNames.includes(fkTable) && fkTable !== modelName) {
          dependencies.get(modelName)?.push(fkTable);
        }
      }
    }
  }

  // Detect circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string): boolean {
    if (recursionStack.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recursionStack.add(node);

    const deps = dependencies.get(node) || [];
    for (const dep of deps) {
      if (hasCycle(dep)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const modelName of modelNames) {
    if (hasCycle(modelName)) {
      errors.push(createError(
        'CIRCULAR_DEPENDENCY',
        `models.${modelName}`,
        `Circular foreign key dependency detected involving: ${modelName}`
      ));
      break; // Only report one cycle error
    }
  }

  return errors;
}

/**
 * Validate Sequence diagram layout
 * Checks message sequence_order is sequential
 */
export function validateSequenceLayout(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!diagram.messages || !Array.isArray(diagram.messages)) {
    return errors;
  }

  // Sort messages by sequence_order and verify they're sequential
  const sorted = [...diagram.messages]
    .filter((m: any) => m && typeof m === 'object')
    .sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0));

  for (let i = 0; i < sorted.length; i++) {
    const expectedOrder = i + 1;
    const actualOrder = sorted[i].sequence_order;

    if (actualOrder !== expectedOrder) {
      errors.push(createError(
        'INVALID_SEQUENCE_ORDER',
        `messages`,
        `sequence_order must be sequential starting from 1 (expected ${expectedOrder}, found ${actualOrder} at position ${i})`
      ));
      break; // Only report one ordering error
    }
  }

  // Check for duplicate sequence_order values
  const orderValues = diagram.messages
    .filter((m: any) => m && typeof m === 'object')
    .map((m: any) => m.sequence_order);

  const uniqueOrders = new Set(orderValues);
  if (orderValues.length !== uniqueOrders.size) {
    errors.push(createError(
      'INVALID_SEQUENCE_ORDER',
      'messages',
      'Duplicate sequence_order values detected'
    ));
  }

  return errors;
}

/**
 * Validate Flow diagram layout
 * Checks for unreachable nodes
 */
export function validateFlowLayout(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!diagram.nodes || !Array.isArray(diagram.nodes) ||
      !diagram.edges || !Array.isArray(diagram.edges)) {
    return errors;
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  const nodeIds = new Set<string>(diagram.nodes.filter((n: any) => n && typeof n === 'object').map((n: any) => n.id));

  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }

  for (const edge of diagram.edges) {
    if (!edge || typeof edge !== 'object') {
      continue;
    }

    if (edge.source && edge.target) {
      adjacency.get(edge.source)?.push(edge.target);
    }
  }

  // Find start nodes
  const startNodes = diagram.nodes.filter(
    (n: any) => n && typeof n === 'object' && n.type === 'start'
  );

  // If no start nodes, can't validate reachability
  if (startNodes.length === 0) {
    return errors;
  }

  // Mark all reachable nodes using DFS from start nodes
  const reachable = new Set<string>();

  function traverse(nodeId: string) {
    if (reachable.has(nodeId)) {
      return;
    }
    reachable.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      traverse(neighbor);
    }
  }

  for (const startNode of startNodes) {
    traverse(startNode.id);
  }

  // Report unreachable nodes (except start nodes themselves)
  for (const node of diagram.nodes) {
    if (!node || typeof node !== 'object') {
      continue;
    }

    if (node.type !== 'start' && !reachable.has(node.id)) {
      errors.push(createError(
        'UNREACHABLE_NODE',
        `nodes`,
        `Node is not reachable from any start node: ${node.id}`
      ));
    }
  }

  // Validate decision nodes have at least 2 outgoing edges
  for (const node of diagram.nodes) {
    if (!node || typeof node !== 'object') {
      continue;
    }

    if (node.type === 'decision') {
      const outgoingEdges = diagram.edges.filter(
        (e: any) => e && typeof e === 'object' && e.source === node.id
      );

      if (outgoingEdges.length < 2) {
        errors.push(createError(
          'MISSING_METADATA' as ErrorCode,
          `nodes`,
          `Decision node should have at least 2 outgoing edges: ${node.id}`
        ));
      }
    }
  }

  return errors;
}
