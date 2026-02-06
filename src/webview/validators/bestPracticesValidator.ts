/**
 * Best practices validator - warns about common issues and anti-patterns
 */

import { ValidationWarning, createWarning, WarningCode } from './types';

/**
 * Validate ERD diagram best practices
 */
export function validateERDBestPractices(diagram: any): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!diagram.models || typeof diagram.models !== 'object') {
    return warnings;
  }

  // Check for models without primary keys
  for (const [modelName, model] of Object.entries(diagram.models)) {
    const modelObj = model as any;
    if (!modelObj || typeof modelObj !== 'object') {
      continue;
    }

    if (!modelObj.fields || typeof modelObj.fields !== 'object') {
      continue;
    }

    const hasPrimaryKey = Object.values<any>(modelObj.fields).some(
      field => field && typeof field === 'object' && field.attributes && field.attributes.primary_key === true
    );

    if (!hasPrimaryKey) {
      warnings.push(createWarning(
        'MISSING_PRIMARY_KEY',
        `models.${modelName}`,
        `Model does not have a primary key: ${modelName}`
      ));
    }

    // Check for foreign keys without indexes
    if (modelObj.indexes && Array.isArray(modelObj.indexes)) {
      const indexedFields = new Set<string>();
      for (const index of modelObj.indexes) {
        if (index && typeof index === 'object' && Array.isArray(index.columns)) {
          for (const col of index.columns) {
            indexedFields.add(col);
          }
        }
      }

      for (const [fieldName, field] of Object.entries(modelObj.fields)) {
        const fieldObj = field as any;
        if (fieldObj && typeof fieldObj === 'object' &&
            fieldObj.attributes && fieldObj.attributes.foreign_key &&
            !indexedFields.has(fieldName)) {
          warnings.push(createWarning(
            'FK_WITHOUT_INDEX',
            `models.${modelName}.fields.${fieldName}`,
            `Foreign key field lacks an index: ${modelName}.${fieldName}`
          ));
        }
      }
    }
  }

  return warnings;
}

/**
 * Validate Sequence diagram best practices
 */
export function validateSequenceBestPractices(diagram: any): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Count participant message usage
  const participantMessageCounts = new Map<string, number>();

  if (diagram.participants && Array.isArray(diagram.participants)) {
    for (const p of diagram.participants) {
      if (p && typeof p === 'object' && p.id && typeof p.id === 'string') {
        participantMessageCounts.set(p.id, 0);
      }
    }
  }

  if (diagram.messages && Array.isArray(diagram.messages)) {
    for (const msg of diagram.messages) {
      if (!msg || typeof msg !== 'object') {
        continue;
      }

      if (msg.from && typeof msg.from === 'string') {
        participantMessageCounts.set(
          msg.from,
          (participantMessageCounts.get(msg.from) || 0) + 1
        );
      }

      if (msg.to && typeof msg.to === 'string') {
        participantMessageCounts.set(
          msg.to,
          (participantMessageCounts.get(msg.to) || 0) + 1
        );
      }
    }
  }

  // Report unused participants
  for (const [participantId, count] of participantMessageCounts) {
    if (count === 0) {
      warnings.push(createWarning(
        'UNUSED_PARTICIPANT',
        'participants',
        `Participant has no messages: ${participantId}`
      ));
    }
  }

  return warnings;
}

/**
 * Validate Flow diagram best practices
 */
export function validateFlowBestPractices(diagram: any): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    return warnings;
  }

  // Check fork/join mismatches
  const forkNodes = diagram.nodes.filter(
    (n: any) => n && typeof n === 'object' && n.type === 'fork'
  );
  const joinNodes = diagram.nodes.filter(
    (n: any) => n && typeof n === 'object' && n.type === 'join'
  );

  if (forkNodes.length !== joinNodes.length) {
    warnings.push(createWarning(
      'FORK_JOIN_MISMATCH',
      'nodes',
      `Fork nodes (${forkNodes.length}) don't match join nodes (${joinNodes.length})`
    ));
  }

  // Check for complex diagrams
  if (diagram.nodes.length > 20) {
    warnings.push(createWarning(
      'COMPLEX_DIAGRAM',
      'nodes',
      `Flow diagram has ${diagram.nodes.length} nodes - consider using groups/subgraphs`
    ));
  }

  // Check decision nodes have conditions on edges
  if (diagram.edges && Array.isArray(diagram.edges)) {
    for (const node of diagram.nodes) {
      if (!node || typeof node !== 'object' || node.type !== 'decision') {
        continue;
      }

      const outgoingEdges = diagram.edges.filter(
        (e: any) => e && typeof e === 'object' && e.source === node.id
      );

      const edgesWithoutConditions = outgoingEdges.filter(
        (e: any) => !e.condition || typeof e.condition !== 'string' || e.condition.trim() === ''
      );

      if (outgoingEdges.length >= 2 && edgesWithoutConditions.length > 0) {
        warnings.push(createWarning(
          'MISSING_CONDITION',
          `edges`,
          `Decision node has edges without conditions: ${node.id}`
        ));
      }
    }
  }

  return warnings;
}
