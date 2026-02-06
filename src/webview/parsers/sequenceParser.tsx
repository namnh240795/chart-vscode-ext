/**
 * Sequence diagram parser
 * Converts YAML sequence diagram schema to React Flow nodes and edges
 */

import React from 'react';
import { SequenceDiagram } from '../types/diagrams';
import { Node, Edge } from 'reactflow';

export interface ParsedSequenceDiagram {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Parse sequence diagram YAML to React Flow format
 */
export function parseSequenceDiagram(diagram: SequenceDiagram): ParsedSequenceDiagram {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Track participant positions
  const participantPositions = new Map<string, number>();
  let xPos = 0;

  // Create participant nodes (lifelines)
  for (const participant of diagram.participants) {
    const position = xPos * 250; // 250px spacing
    participantPositions.set(participant.id, position);

    nodes.push({
      id: participant.id,
      type: 'sequenceLifeline',
      position: { x: position, y: 0 },
      data: {
        id: participant.id,
        type: participant.type,
        label: participant.label,
        description: participant.description,
      },
      style: {
        height: Math.max(600, diagram.messages.length * 100),
      },
    });

    xPos++;
  }

  // Calculate message positions
  const messageHeight = 80;
  let yPos = 120; // Start below participant headers

  // Sort messages by sequence_order
  const sortedMessages = [...diagram.messages].sort((a, b) => a.sequence_order - b.sequence_order);

  // Create edges directly between lifelines with labels
  for (const message of sortedMessages) {
    // Determine edge type based on message.type
    let edgeType: string = 'syncMessage';
    if (message.type === 'async') {
      edgeType = 'asyncMessage';
    }

    // Create horizontal edge from sender to receiver
    edges.push({
      id: `edge-${message.id}`,
      source: message.from,
      target: message.to,
      type: edgeType,
      label: message.label,
      data: {
        from: message.from,
        to: message.to,
        messageType: message.type,
        label: message.label,
      },
      style: {
        stroke: getMessageColor(message.type),
        strokeWidth: 2,
      },
    });

    // Add return message if exists
    if (message.return_message) {
      yPos += messageHeight;

      edges.push({
        id: `return-edge-${message.id}`,
        source: message.to,
        target: message.from,
        type: 'returnMessage',
        label: message.return_message,
        data: {
          from: message.to,
          to: message.from,
          messageType: 'return',
          label: message.return_message,
        },
        style: {
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          strokeDasharray: '5,5',
        },
      });

      yPos += 40;
    }

    yPos += messageHeight;
  }

  // Handle blocks (alt, opt, loop, par, rect)
  if (diagram.blocks && diagram.blocks.length > 0) {
    for (const block of diagram.blocks) {
      const blockMessages = block.messages;
      if (blockMessages.length === 0) continue;

      // Find Y range for this block
      const firstMsg = sortedMessages.find(m => m.id === blockMessages[0]);
      const lastMsg = sortedMessages.find(m => m.id === blockMessages[blockMessages.length - 1]);

      if (!firstMsg || !lastMsg) continue;

      const firstMsgIndex = sortedMessages.indexOf(firstMsg);
      const lastMsgIndex = sortedMessages.indexOf(lastMsg);

      const blockYStart = 120 + firstMsgIndex * messageHeight;
      const blockYEnd = 120 + (lastMsgIndex + 1) * messageHeight;

      // Find X range (all participants involved)
      const participantsInBlock = new Set<string>();
      for (const msgId of blockMessages) {
        const msg = sortedMessages.find(m => m.id === msgId);
        if (msg) {
          participantsInBlock.add(msg.from);
          participantsInBlock.add(msg.to);
        }
      }

      const xPositions = Array.from(participantsInBlock)
        .map(id => participantPositions.get(id))
        .filter((p): p is number => p !== undefined)
        .sort((a, b) => a - b);

      if (xPositions.length === 0) continue;

      const blockXStart = xPositions[0] - 30;
      const blockXEnd = xPositions[xPositions.length - 1] + 130;

      // Create block node (background container)
      nodes.push({
        id: `block-${block.id}`,
        type: 'sequenceBlock',
        position: {
          x: blockXStart,
          y: blockYStart - 20,
        },
        data: {
          id: block.id,
          type: block.type,
          condition: block.condition,
          label: block.label,
          messages: block.messages,
        },
        style: {
          width: blockXEnd - blockXStart,
          height: blockYEnd - blockYStart + 40,
          zIndex: -1,
        },
      });
    }
  }

  // Handle notes
  if (diagram.notes && diagram.notes.length > 0) {
    let noteY = 120;
    for (const note of diagram.notes) {
      const noteId = `note-${note.id}`;

      // Find position based on attached_to
      let x = 50;
      if (note.attached_to && note.attached_to.length > 0) {
        const positions = note.attached_to
          .map(id => participantPositions.get(id))
          .filter((p): p is number => p !== undefined);
        if (positions.length > 0) {
          x = Math.max(...positions) + 50; // To the right of the rightmost participant
        }
      }

      nodes.push({
        id: noteId,
        type: 'sequenceNote',
        position: { x, y: noteY },
        data: {
          id: note.id,
          text: note.text,
          attachedTo: note.attached_to,
          position: note.position || 'right',
        },
      });

      noteY += 120;
    }
  }

  return { nodes, edges };
}

function getMessageColor(type: string): string {
  switch (type) {
    case 'sync':
      return '#3b82f6'; // blue
    case 'async':
      return '#8b5cf6'; // purple
    case 'return':
      return '#94a3b8'; // slate
    default:
      return '#ffffff';
  }
}

/**
 * Calculate auto-layout for sequence diagram
 */
export function calculateSequenceLayout(diagram: SequenceDiagram): {
  width: number;
  height: number;
} {
  const participantCount = diagram.participants.length;
  const messageCount = diagram.messages.length;

  const width = Math.max(800, participantCount * 280);
  const height = Math.max(600, 200 + messageCount * 80);

  return { width, height };
}
