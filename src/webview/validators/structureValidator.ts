/**
 * Structure validator - validates required fields and data types
 */

import { ValidationError, createError, ErrorCode } from './types';

/**
 * Validate ERD diagram structure
 */
export function validateERDStructure(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate models
  if (!diagram.models || typeof diagram.models !== 'object') {
    errors.push(createError('MISSING_METADATA' as ErrorCode, 'models', 'ERD diagrams require a "models" object'));
    return errors;
  }

  // Validate each model
  for (const [modelName, model] of Object.entries(diagram.models)) {
    const modelPath = `models.${modelName}`;
    const modelObj = model as any;

    // Check if model is an object
    if (!modelObj || typeof modelObj !== 'object') {
      errors.push(createError('MISSING_METADATA' as ErrorCode, modelPath, `Model must be an object`));
      continue;
    }

    // Check if model has fields
    if (!modelObj.fields || typeof modelObj.fields !== 'object') {
      errors.push(createError('MISSING_METADATA' as ErrorCode, `${modelPath}.fields`, `Model must have a "fields" object`));
      continue;
    }

    // Validate each field
    for (const [fieldName, field] of Object.entries(modelObj.fields)) {
      const fieldPath = `${modelPath}.fields.${fieldName}`;
      const fieldObj = field as any;

      if (!fieldObj || typeof fieldObj !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, fieldPath, `Field must be an object`));
        continue;
      }

      // Check field_type
      if (!fieldObj.field_type || typeof fieldObj.field_type !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.field_type`, `Field must have a "field_type" string`));
      }

      // Validate constraints
      if (fieldObj.constraints !== undefined) {
        if (typeof fieldObj.constraints !== 'object') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.constraints`, `Constraints must be an object`));
        } else if (fieldObj.constraints.not_null !== undefined && typeof fieldObj.constraints.not_null !== 'boolean') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.constraints.not_null`, `not_null must be a boolean`));
        }
      }

      // Validate attributes
      if (fieldObj.attributes !== undefined) {
        if (typeof fieldObj.attributes !== 'object') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.attributes`, `Attributes must be an object`));
        } else {
          // Validate foreign_key
          if (fieldObj.attributes.foreign_key !== undefined) {
            if (typeof fieldObj.attributes.foreign_key !== 'object') {
              errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.attributes.foreign_key`, `foreign_key must be an object`));
            } else {
              const fk = fieldObj.attributes.foreign_key;
              if (!fk.table || typeof fk.table !== 'string') {
                errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.attributes.foreign_key.table`, `foreign_key must have a "table" string`));
              }
              if (!fk.column || typeof fk.column !== 'string') {
                errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.attributes.foreign_key.column`, `foreign_key must have a "column" string`));
              }
            }
          }

          // Validate boolean attributes
          const booleanAttrs = ['primary_key', 'unique', 'virtual', 'is_list'];
          for (const attr of booleanAttrs) {
            if (fieldObj.attributes[attr] !== undefined && typeof fieldObj.attributes[attr] !== 'boolean') {
              errors.push(createError('MISSING_METADATA' as ErrorCode, `${fieldPath}.attributes.${attr}`, `${attr} must be a boolean`));
            }
          }
        }
      }
    }

    // Validate indexes
    if (modelObj.indexes !== undefined) {
      if (!Array.isArray(modelObj.indexes)) {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${modelPath}.indexes`, `indexes must be an array`));
      } else {
        for (let i = 0; i < modelObj.indexes.length; i++) {
          const index = modelObj.indexes[i];
          const indexPath = `${modelPath}.indexes[${i}]`;

          if (!index || typeof index !== 'object') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, indexPath, `Index must be an object`));
            continue;
          }

          if (!index.index_name || typeof index.index_name !== 'string') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${indexPath}.index_name`, `Index must have an "index_name" string`));
          }

          if (!index.columns || !Array.isArray(index.columns)) {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${indexPath}.columns`, `Index must have a "columns" array`));
          }

          if (index.unique !== undefined && typeof index.unique !== 'boolean') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${indexPath}.unique`, `Index unique must be a boolean`));
          }
        }
      }
    }

    // Validate unique_constraints
    if (modelObj.unique_constraints !== undefined) {
      if (!Array.isArray(modelObj.unique_constraints)) {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${modelPath}.unique_constraints`, `unique_constraints must be an array`));
      } else {
        for (let i = 0; i < modelObj.unique_constraints.length; i++) {
          const uc = modelObj.unique_constraints[i];
          const ucPath = `${modelPath}.unique_constraints[${i}]`;

          if (!uc || typeof uc !== 'object') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, ucPath, `Unique constraint must be an object`));
            continue;
          }

          if (!uc.constraint_name || typeof uc.constraint_name !== 'string') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${ucPath}.constraint_name`, `Unique constraint must have a "constraint_name" string`));
          }

          if (!uc.columns || !Array.isArray(uc.columns)) {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${ucPath}.columns`, `Unique constraint must have a "columns" array`));
          }
        }
      }
    }
  }

  // Validate enums
  if (diagram.enums !== undefined) {
    if (typeof diagram.enums !== 'object') {
      errors.push(createError('MISSING_METADATA' as ErrorCode, 'enums', `enums must be an object`));
    } else {
      for (const [enumName, enumVal] of Object.entries(diagram.enums)) {
        const enumPath = `enums.${enumName}`;
        const enumObj = enumVal as any;

        if (!enumObj || typeof enumObj !== 'object') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, enumPath, `Enum must be an object`));
          continue;
        }

        if (!enumObj.values || !Array.isArray(enumObj.values)) {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${enumPath}.values`, `Enum must have a "values" array`));
          continue;
        }

        for (let i = 0; i < enumObj.values.length; i++) {
          const val = enumObj.values[i];
          const valPath = `${enumPath}.values[${i}]`;

          if (!val || typeof val !== 'object') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, valPath, `Enum value must be an object`));
            continue;
          }

          if (!val.value_name || typeof val.value_name !== 'string') {
            errors.push(createError('MISSING_METADATA' as ErrorCode, `${valPath}.value_name`, `Enum value must have a "value_name" string`));
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validate Sequence diagram structure
 */
export function validateSequenceStructure(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate participants
  if (!diagram.participants || !Array.isArray(diagram.participants)) {
    errors.push(createError('MISSING_METADATA' as ErrorCode, 'participants', 'Sequence diagrams require a "participants" array'));
  } else {
    const participantIds = new Set<string>();

    for (let i = 0; i < diagram.participants.length; i++) {
      const participant = diagram.participants[i];
      const path = `participants[${i}]`;

      if (!participant || typeof participant !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, path, 'Participant must be an object'));
        continue;
      }

      if (!participant.id || typeof participant.id !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.id`, 'Participant must have an "id" string'));
      } else if (participantIds.has(participant.id)) {
        errors.push(createError('DUPLICATE_PARTICIPANT_ID' as ErrorCode, `${path}.id`, `Duplicate participant ID: ${participant.id}`));
      } else {
        participantIds.add(participant.id);
      }

      if (!participant.type || !['actor', 'participant', 'database'].includes(participant.type)) {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.type`, 'Participant type must be one of: actor, participant, database'));
      }

      if (!participant.label || typeof participant.label !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.label`, 'Participant must have a "label" string'));
      }
    }
  }

  // Validate messages
  if (!diagram.messages || !Array.isArray(diagram.messages)) {
    errors.push(createError('MISSING_METADATA' as ErrorCode, 'messages', 'Sequence diagrams require a "messages" array'));
  } else {
    const messageIds = new Set<string>();

    for (let i = 0; i < diagram.messages.length; i++) {
      const message = diagram.messages[i];
      const path = `messages[${i}]`;

      if (!message || typeof message !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, path, 'Message must be an object'));
        continue;
      }

      if (!message.id || typeof message.id !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.id`, 'Message must have an "id" string'));
      } else if (messageIds.has(message.id)) {
        errors.push(createError('DUPLICATE_MESSAGE_ID' as ErrorCode, `${path}.id`, `Duplicate message ID: ${message.id}`));
      } else {
        messageIds.add(message.id);
      }

      if (!message.from || typeof message.from !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.from`, 'Message must have a "from" string'));
      }

      if (!message.to || typeof message.to !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.to`, 'Message must have a "to" string'));
      }

      if (!message.label || typeof message.label !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.label`, 'Message must have a "label" string'));
      }

      if (!message.type || !['sync', 'async'].includes(message.type)) {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.type`, 'Message type must be one of: sync, async'));
      }

      if (message.return_message !== undefined && typeof message.return_message !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.return_message`, 'return_message must be a string'));
      }

      if (message.sequence_order === undefined || typeof message.sequence_order !== 'number') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.sequence_order`, 'Message must have a "sequence_order" number'));
      }
    }
  }

  // Validate blocks
  if (diagram.blocks !== undefined) {
    if (!Array.isArray(diagram.blocks)) {
      errors.push(createError('MISSING_METADATA' as ErrorCode, 'blocks', 'blocks must be an array'));
    } else {
      for (let i = 0; i < diagram.blocks.length; i++) {
        const block = diagram.blocks[i];
        const path = `blocks[${i}]`;

        if (!block || typeof block !== 'object') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, path, 'Block must be an object'));
          continue;
        }

        if (!block.type || !['alt', 'opt', 'loop', 'par', 'rect'].includes(block.type)) {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.type`, 'Block type must be one of: alt, opt, loop, par, rect'));
        }

        // Condition is required for alt, opt, loop
        if (['alt', 'opt', 'loop'].includes(block.type) && !block.condition) {
          errors.push(createError('MISSING_BLOCK_CONDITION' as ErrorCode, `${path}.condition`, `Block type "${block.type}" requires a "condition"`));
        }

        if (!block.messages || !Array.isArray(block.messages)) {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.messages`, 'Block must have a "messages" array'));
        }
      }
    }
  }

  return errors;
}

/**
 * Validate Flow diagram structure
 */
export function validateFlowStructure(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate nodes
  if (!diagram.nodes || !Array.isArray(diagram.nodes)) {
    errors.push(createError('MISSING_METADATA' as ErrorCode, 'nodes', 'Flow diagrams require a "nodes" array'));
  } else {
    const nodeIds = new Set<string>();
    let startNodeCount = 0;

    for (let i = 0; i < diagram.nodes.length; i++) {
      const node = diagram.nodes[i];
      const path = `nodes[${i}]`;

      if (!node || typeof node !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, path, 'Node must be an object'));
        continue;
      }

      if (!node.id || typeof node.id !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.id`, 'Node must have an "id" string'));
      } else if (nodeIds.has(node.id)) {
        errors.push(createError('DUPLICATE_NODE_ID' as ErrorCode, `${path}.id`, `Duplicate node ID: ${node.id}`));
      } else {
        nodeIds.add(node.id);
      }

      const validTypes = ['start', 'end', 'process', 'decision', 'data', 'database', 'document', 'fork', 'join'];
      if (!node.type || !validTypes.includes(node.type)) {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.type`, `Node type must be one of: ${validTypes.join(', ')}`));
      } else if (node.type === 'start') {
        startNodeCount++;
      }

      if (!node.label || typeof node.label !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.label`, 'Node must have a "label" string'));
      }

      if (!node.position || typeof node.position !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.position`, 'Node must have a "position" object'));
      } else {
        if (node.position.x === undefined || typeof node.position.x !== 'number') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.position.x`, 'position.x must be a number'));
        }
        if (node.position.y === undefined || typeof node.position.y !== 'number') {
          errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.position.y`, 'position.y must be a number'));
        }
      }
    }

    if (startNodeCount === 0) {
      errors.push(createError('NO_START_NODE' as ErrorCode, 'nodes', 'Flow diagram must have at least one node with type: start'));
    } else if (startNodeCount > 1) {
      errors.push(createError('MULTIPLE_START_NODES' as ErrorCode, 'nodes', 'Flow diagram should have only one start node'));
    }
  }

  // Validate edges
  if (!diagram.edges || !Array.isArray(diagram.edges)) {
    errors.push(createError('MISSING_METADATA' as ErrorCode, 'edges', 'Flow diagrams require an "edges" array'));
  } else {
    const edgeIds = new Set<string>();

    for (let i = 0; i < diagram.edges.length; i++) {
      const edge = diagram.edges[i];
      const path = `edges[${i}]`;

      if (!edge || typeof edge !== 'object') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, path, 'Edge must be an object'));
        continue;
      }

      if (!edge.id || typeof edge.id !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.id`, 'Edge must have an "id" string'));
      } else if (edgeIds.has(edge.id)) {
        errors.push(createError('DUPLICATE_EDGE_ID' as ErrorCode, `${path}.id`, `Duplicate edge ID: ${edge.id}`));
      } else {
        edgeIds.add(edge.id);
      }

      if (!edge.source || typeof edge.source !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.source`, 'Edge must have a "source" string'));
      }

      if (!edge.target || typeof edge.target !== 'string') {
        errors.push(createError('MISSING_METADATA' as ErrorCode, `${path}.target`, 'Edge must have a "target" string'));
      }
    }
  }

  return errors;
}
