/**
 * Reference validator - validates that references exist (FK targets, participant IDs, node IDs)
 */

import { ValidationError, createError, ErrorCode } from './types';

/**
 * Validate ERD diagram references
 */
export function validateERDReferences(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!diagram.models || typeof diagram.models !== 'object') {
    return errors;
  }

  const modelNames = new Set(Object.keys(diagram.models));

  // Validate foreign key references
  for (const [modelName, model] of Object.entries(diagram.models)) {
    const modelObj = model as any;
    if (!modelObj.fields || typeof modelObj.fields !== 'object') {
      continue;
    }

    for (const [fieldName, field] of Object.entries(modelObj.fields)) {
      const fieldObj = field as any;
      if (!fieldObj.attributes?.foreign_key) {
        continue;
      }

      const fk = fieldObj.attributes.foreign_key;
      const fkPath = `models.${modelName}.fields.${fieldName}.attributes.foreign_key`;

      // Check if referenced table exists
      if (!fk.table || typeof fk.table !== 'string') {
        continue; // Already caught by structure validator
      }

      if (!modelNames.has(fk.table)) {
        errors.push(createError(
          'FK_TABLE_NOT_FOUND',
          `${fkPath}.table`,
          `Foreign key references non-existent table: ${fk.table}`
        ));
        continue;
      }

      // Check if referenced column exists
      if (!fk.column || typeof fk.column !== 'string') {
        continue; // Already caught by structure validator
      }

      const targetModel = diagram.models[fk.table] as any;
      if (!targetModel || !targetModel.fields || typeof targetModel.fields !== 'object') {
        continue;
      }

      if (!targetModel.fields[fk.column]) {
        errors.push(createError(
          'FK_COLUMN_NOT_FOUND',
          `${fkPath}.column`,
          `Foreign key references non-existent column: ${fk.column}`
        ));
      }
    }
  }

  return errors;
}

/**
 * Validate Sequence diagram references
 */
export function validateSequenceReferences(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Collect participant IDs
  const participantIds = new Set<string>();
  if (diagram.participants && Array.isArray(diagram.participants)) {
    for (const p of diagram.participants) {
      if (p.id && typeof p.id === 'string') {
        participantIds.add(p.id);
      }
    }
  }

  // Collect message IDs
  const messageIds = new Set<string>();
  if (diagram.messages && Array.isArray(diagram.messages)) {
    for (const m of diagram.messages) {
      if (m.id && typeof m.id === 'string') {
        messageIds.add(m.id);
      }
    }
  }

  // Validate message participant references
  if (diagram.messages && Array.isArray(diagram.messages)) {
    for (let i = 0; i < diagram.messages.length; i++) {
      const msg = diagram.messages[i];
      const path = `messages[${i}]`;

      if (!msg || typeof msg !== 'object') {
        continue;
      }

      if (msg.from && typeof msg.from === 'string') {
        if (!participantIds.has(msg.from)) {
          errors.push(createError(
            'PARTICIPANT_NOT_FOUND',
            `${path}.from`,
            `Message references non-existent participant: ${msg.from}`
          ));
        }
      }

      if (msg.to && typeof msg.to === 'string') {
        if (!participantIds.has(msg.to)) {
          errors.push(createError(
            'PARTICIPANT_NOT_FOUND',
            `${path}.to`,
            `Message references non-existent participant: ${msg.to}`
          ));
        }
      }
    }
  }

  // Validate block message references
  if (diagram.blocks && Array.isArray(diagram.blocks)) {
    for (let i = 0; i < diagram.blocks.length; i++) {
      const block = diagram.blocks[i];
      const path = `blocks[${i}]`;

      if (!block || typeof block !== 'object') {
        continue;
      }

      if (block.messages && Array.isArray(block.messages)) {
        for (const msgId of block.messages) {
          if (typeof msgId === 'string' && !messageIds.has(msgId)) {
            errors.push(createError(
              'MESSAGE_NOT_FOUND',
              `${path}.messages`,
              `Block references non-existent message: ${msgId}`
            ));
          }
        }
      }

      // Validate parent_block reference
      if (block.parent_block && typeof block.parent_block === 'string') {
        const parentExists = diagram.blocks?.some(
          (b: any) => b && typeof b === 'object' && b.id === block.parent_block
        );
        if (!parentExists) {
          errors.push(createError(
            'MESSAGE_NOT_FOUND' as ErrorCode,
            `${path}.parent_block`,
            `Block references non-existent parent block: ${block.parent_block}`
          ));
        }
      }
    }
  }

  // Validate note attachments
  if (diagram.notes && Array.isArray(diagram.notes)) {
    for (let i = 0; i < diagram.notes.length; i++) {
      const note = diagram.notes[i];
      const path = `notes[${i}]`;

      if (!note || typeof note !== 'object') {
        continue;
      }

      if (note.attached_to && Array.isArray(note.attached_to)) {
        for (const attachment of note.attached_to) {
          const isParticipant = participantIds.has(attachment);
          const isMessage = messageIds.has(attachment);

          if (!isParticipant && !isMessage) {
            errors.push(createError(
              'PARTICIPANT_NOT_FOUND' as ErrorCode,
              `${path}.attached_to`,
              `Note references non-existent participant or message: ${attachment}`
            ));
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validate Flow diagram references
 */
export function validateFlowReferences(diagram: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Collect node IDs
  const nodeIds = new Set<string>();
  if (diagram.nodes && Array.isArray(diagram.nodes)) {
    for (const n of diagram.nodes) {
      if (n.id && typeof n.id === 'string') {
        nodeIds.add(n.id);
      }
    }
  }

  // Validate edge source/target references
  if (diagram.edges && Array.isArray(diagram.edges)) {
    for (let i = 0; i < diagram.edges.length; i++) {
      const edge = diagram.edges[i];
      const path = `edges[${i}]`;

      if (!edge || typeof edge !== 'object') {
        continue;
      }

      if (edge.source && typeof edge.source === 'string') {
        if (!nodeIds.has(edge.source)) {
          errors.push(createError(
            'NODE_NOT_FOUND',
            `${path}.source`,
            `Edge references non-existent source node: ${edge.source}`
          ));
        }
      }

      if (edge.target && typeof edge.target === 'string') {
        if (!nodeIds.has(edge.target)) {
          errors.push(createError(
            'NODE_NOT_FOUND',
            `${path}.target`,
            `Edge references non-existent target node: ${edge.target}`
          ));
        }
      }
    }
  }

  // Validate group node references
  if (diagram.groups && Array.isArray(diagram.groups)) {
    for (let i = 0; i < diagram.groups.length; i++) {
      const group = diagram.groups[i];
      const path = `groups[${i}]`;

      if (!group || typeof group !== 'object') {
        continue;
      }

      if (group.nodes && Array.isArray(group.nodes)) {
        for (const nodeId of group.nodes) {
          if (typeof nodeId === 'string' && !nodeIds.has(nodeId)) {
            errors.push(createError(
              'NODE_NOT_FOUND',
              `${path}.nodes`,
              `Group references non-existent node: ${nodeId}`
            ));
          }
        }
      }
    }
  }

  return errors;
}
