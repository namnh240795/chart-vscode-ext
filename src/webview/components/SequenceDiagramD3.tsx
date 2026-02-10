import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { NodeProps } from 'reactflow';
import * as d3 from 'd3';
import { SequenceParticipant, SequenceMessage, SequenceColor, SequenceBlock } from '../types/diagrams';

export interface SequenceDiagramData {
  participants: Record<string, SequenceParticipant>;
  messages: SequenceMessage[];
  blocks?: SequenceBlock[];
  style?: {
    default_color?: SequenceColor;
    participant_width?: number;
    show_lifelines?: boolean;
    show_activations?: boolean;
  };
}

type HighlightedElement = {
  type: 'participant' | 'message' | 'block';
  id: string;
};

type HighlightState = {
  elements: HighlightedElement[];
};

const SequenceDiagramD3: React.FC<NodeProps<SequenceDiagramData>> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [highlighted, setHighlighted] = useState<HighlightState>({ elements: [] });

  // Clear highlight when clicking on empty space
  const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (event.target === event.currentTarget) {
      setHighlighted({ elements: [] });
    }
  }, []);

  // Compute related elements based on selection
  const relatedElements = useMemo(() => {
    const highlightedSet = new Set<string>();
    const participantsSet = new Set<string>();
    const messagesSet = new Set<string>();
    const blocksSet = new Set<string>();

    highlighted.elements.forEach(el => {
      if (el.type === 'participant') {
        // Highlight this participant and all related messages
        participantsSet.add(el.id);
        data.messages.forEach(msg => {
          if (msg.from === el.id || msg.to === el.id) {
            messagesSet.add(msg.id);
          }
        });
      } else if (el.type === 'message') {
        // Highlight this message and its sender/receiver
        messagesSet.add(el.id);
        const message = data.messages.find(m => m.id === el.id);
        if (message) {
          participantsSet.add(message.from);
          participantsSet.add(message.to);
        }
      } else if (el.type === 'block') {
        // Highlight this block, all messages in it, and involved participants
        blocksSet.add(el.id);
        const block = data.blocks?.find(b => b.id === el.id);
        if (block) {
          block.messages?.forEach(msgId => {
            messagesSet.add(msgId);
            const message = data.messages.find(m => m.id === msgId);
            if (message) {
              participantsSet.add(message.from);
              participantsSet.add(message.to);
            }
          });
        }
      }
    });

    return {
      participants: participantsSet,
      messages: messagesSet,
      blocks: blocksSet,
    };
  }, [highlighted, data.messages, data.blocks]);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Configuration
    const participantWidth = data.style?.participant_width ?? 150;
    const horizontalGap = 100;
    const startX = 50;
    const startY = 80;
    const messageSpacing = 65;
    const headerHeight = 70;

    // Sort messages by sequence_order
    const sortedMessages = [...data.messages].sort((a, b) => a.sequence_order - b.sequence_order);

    // Calculate dimensions
    const participantIds = Object.keys(data.participants).sort((a, b) => {
      const orderA = data.participants[a].order ?? 0;
      const orderB = data.participants[b].order ?? 0;
      return orderA - orderB;
    });

    const width = startX + participantIds.length * (participantWidth + horizontalGap) + 50;
    const bottomHeaderHeight = 50;
    const height = startY + headerHeight + sortedMessages.length * messageSpacing + 100 + bottomHeaderHeight;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Define arrow markers
    const defs = svg.append('defs');

    // Create marker for each participant color
    const colorMap: Record<SequenceColor, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      orange: '#f97316',
      purple: '#8b5cf6',
      gray: '#6b7280',
      yellow: '#fbbf24',
      teal: '#14b8a6',
    };

    const getParticipantColor = (participantId: string): string => {
      const participant = data.participants[participantId];
      const colorKey = participant.color || data.style?.default_color;
      return colorMap[colorKey || 'blue'];
    };

    // Highlight effect filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create markers for each arrow type and color
    const arrowTypes = ['solid', 'dashed', 'open_solid', 'open_dashed', 'dot'] as const;
    participantIds.forEach(pid => {
      const color = getParticipantColor(pid);
      arrowTypes.forEach(type => {
        const isOpen = type === 'open_solid' || type === 'open_dashed' || type === 'dot';

        // Normal marker
        const normalMarker = defs.append('marker')
          .attr('id', `arrow-${pid}-${type}`)
          .attr('markerWidth', '10')
          .attr('markerHeight', '10')
          .attr('refX', '9')
          .attr('refY', '3')
          .attr('orient', 'auto')
          .attr('markerUnits', 'userSpaceOnUse');

        if (isOpen) {
          // Open arrows: stroke only, no fill
          normalMarker.append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .attr('fill', 'none')
            .attr('stroke', '#475569')
            .attr('stroke-width', '1.5');
        } else {
          // Solid/closed arrows: fill only
          normalMarker.append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .attr('fill', color);
        }

        // Highlighted marker (yellow)
        const highlightedMarker = defs.append('marker')
          .attr('id', `arrow-${pid}-${type}-highlighted`)
          .attr('markerWidth', '10')
          .attr('markerHeight', '10')
          .attr('refX', '9')
          .attr('refY', '3')
          .attr('orient', 'auto')
          .attr('markerUnits', 'userSpaceOnUse');

        if (isOpen) {
          // Open arrows: stroke only, no fill
          highlightedMarker.append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .attr('fill', 'none')
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', '1.5');
        } else {
          // Solid/closed arrows: fill only
          highlightedMarker.append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .attr('fill', '#fbbf24');
        }
      });
    });

    // Helper to check highlight intensity
    const getHighlightIntensity = (type: 'participant' | 'message' | 'block', id: string): 'primary' | 'secondary' | 'none' => {
      // Check if this is the directly clicked element (primary)
      const isPrimary = highlighted.elements.some(el => el.type === type && el.id === id);
      if (isPrimary) return 'primary';

      // Check if this is a related element (secondary)
      if (type === 'participant' && relatedElements.participants.has(id)) return 'secondary';
      if (type === 'message' && relatedElements.messages.has(id)) return 'secondary';
      if (type === 'block' && relatedElements.blocks.has(id)) return 'secondary';

      return 'none';
    };

    // Draw blocks (alt, opt, loop, par)
    if (data.blocks && data.blocks.length > 0) {
      data.blocks.forEach((block) => {
        const blockMessageIds = block.messages || [];
        const blockMessages = sortedMessages.filter(m => blockMessageIds.includes(m.id));

        if (blockMessages.length === 0) return;

        const firstMsgIndex = sortedMessages.findIndex(m => blockMessageIds.includes(m.id));
        const lastMsgIndex = sortedMessages.findIndex(m =>
          blockMessageIds.includes(m.id)
        );

        if (firstMsgIndex === -1) return;

        const blockStartY = startY + headerHeight + firstMsgIndex * messageSpacing - 20;
        const blockEndY = startY + headerHeight + (lastMsgIndex + 1) * messageSpacing + 10;
        const blockHeight = blockEndY - blockStartY;

        const blockTypeLabel = {
          alt: 'alt',
          opt: 'opt',
          loop: 'loop',
          par: 'par',
          critical: 'critical',
          neg: 'neg',
        }[block.type] || block.type;

        const highlightIntensity = getHighlightIntensity('block', block.id);

        // For alt blocks, draw each section with its own width
        if (block.type === 'alt' && block.alt_sections && block.alt_sections.length > 0) {
          const numSections = block.alt_sections.length;
          const sectionHeight = blockHeight / numSections;

          block.alt_sections.forEach((section, idx) => {
            const sectionTop = blockStartY + idx * sectionHeight;
            const sectionBottom = sectionTop + sectionHeight;

            // Find participants involved in THIS section only
            const sectionMessageIds = section.messages || [];
            const sectionParticipants = new Set<string>();
            sectionMessageIds.forEach(msgId => {
              const msg = sortedMessages.find(m => m.id === msgId);
              if (msg) {
                sectionParticipants.add(msg.from);
                sectionParticipants.add(msg.to);
              }
            });

            const sectionIndices = Array.from(sectionParticipants)
              .map(pid => participantIds.indexOf(pid))
              .filter(idx => idx !== -1);

            if (sectionIndices.length === 0) return;

            const sectionMinIndex = Math.min(...sectionIndices);
            const sectionMaxIndex = Math.max(...sectionIndices);

            const sectionX = startX + sectionMinIndex * (participantWidth + horizontalGap) - 20;
            const sectionWidth = (sectionMaxIndex - sectionMinIndex + 1) * (participantWidth + horizontalGap) + 40;

            // Draw section frame
            const sectionGroup = svg.append('g')
              .attr('class', `sequence-block ${block.type}`)
              .style('cursor', 'pointer')
              .on('click', function(event) {
                event.stopPropagation();
                setHighlighted({ elements: [{ type: 'block', id: block.id }] });
              });

            // Section background
            sectionGroup.append('rect')
              .attr('x', sectionX)
              .attr('y', sectionTop)
              .attr('width', sectionWidth)
              .attr('height', sectionHeight)
              .attr('fill', 'rgba(239, 68, 68, 0.05)')
              .attr('stroke', '#ef4444')
              .attr('stroke-width', 1.5)
              .attr('rx', 4);

            // Section label
            const sectionLabel = section.condition ? `[${section.condition}]` : `[else]`;
            const sectionLabelWidth = sectionLabel.length * 7 + 16;
            const sectionY = sectionTop + 20;

            sectionGroup.append('rect')
              .attr('x', sectionX + 8)
              .attr('y', sectionY - 10)
              .attr('width', sectionLabelWidth)
              .attr('height', 20)
              .attr('fill', '#ef4444')
              .attr('rx', 3)
              .attr('opacity', 0.9)
              .style('pointer-events', 'none');

            sectionGroup.append('text')
              .attr('x', sectionX + 8 + sectionLabelWidth / 2)
              .attr('y', sectionY + 4)
              .attr('text-anchor', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .style('pointer-events', 'none')
              .text(sectionLabel);

            // Alt header at the top of the first section
            if (idx === 0) {
              const headerText = blockTypeLabel;
              const headerWidth = headerText.length * 8 + 20;
              sectionGroup.append('rect')
                .attr('x', sectionX)
                .attr('y', blockStartY - 14)
                .attr('width', headerWidth)
                .attr('height', 22)
                .attr('fill', '#ef4444')
                .attr('rx', 4);

              sectionGroup.append('text')
                .attr('x', sectionX + 10)
                .attr('y', blockStartY + 2)
                .attr('fill', 'white')
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .attr('font-family', 'system-ui, -apple-system, sans-serif')
                .style('pointer-events', 'none')
                .text(headerText);
            }
          });
        } else {
          // For non-alt blocks (opt, loop, par, etc.), use original logic
          const involvedParticipants = new Set<string>();
          blockMessages.forEach(msg => {
            involvedParticipants.add(msg.from);
            involvedParticipants.add(msg.to);
          });

          const participantIndices = Array.from(involvedParticipants)
            .map(pid => participantIds.indexOf(pid))
            .filter(idx => idx !== -1);

          if (participantIndices.length === 0) return;

          const minIndex = Math.min(...participantIndices);
          const maxIndex = Math.max(...participantIndices);

          const blockX = startX + minIndex * (participantWidth + horizontalGap) - 20;
          const blockWidth = (maxIndex - minIndex + 1) * (participantWidth + horizontalGap) + 40;

          // Draw block frame
          const blockGroup = svg.append('g')
            .attr('class', `sequence-block ${block.type}`)
            .style('cursor', 'pointer')
            .on('click', function(event) {
              event.stopPropagation();
              setHighlighted({ elements: [{ type: 'block', id: block.id }] });
            });

          // Background
          blockGroup.append('rect')
            .attr('x', blockX)
            .attr('y', blockStartY)
            .attr('width', blockWidth)
            .attr('height', blockHeight)
            .attr('fill', block.type === 'alt' ? 'rgba(239, 68, 68, 0.05)' :
                       block.type === 'opt' ? 'rgba(59, 130, 246, 0.05)' :
                       block.type === 'loop' ? 'rgba(16, 185, 129, 0.05)' :
                       block.type === 'critical' ? 'rgba(251, 191, 36, 0.05)' :
                       block.type === 'neg' ? 'rgba(107, 114, 128, 0.05)' :
                       'rgba(139, 92, 246, 0.05)')
            .attr('stroke', block.type === 'alt' ? '#ef4444' :
                         block.type === 'opt' ? '#3b82f6' :
                         block.type === 'loop' ? '#10b981' :
                         block.type === 'critical' ? '#fbbf24' :
                         block.type === 'neg' ? '#6b7280' :
                         '#8b5cf6')
            .attr('stroke-width', 1.5)
            .attr('rx', 4);

          // Label background
          const labelText = `${blockTypeLabel}${block.condition ? ` [${block.condition}]` : ''}`;
          const labelWidth = labelText.length * 8 + 20;
          blockGroup.append('rect')
            .attr('x', blockX)
            .attr('y', blockStartY - 14)
            .attr('width', labelWidth)
            .attr('height', 22)
            .attr('fill', block.type === 'alt' ? '#ef4444' :
                       block.type === 'opt' ? '#3b82f6' :
                       block.type === 'loop' ? '#10b981' :
                       block.type === 'critical' ? '#fbbf24' :
                       block.type === 'neg' ? '#6b7280' :
                       '#8b5cf6')
            .attr('rx', 4);

          // Label text
          blockGroup.append('text')
            .attr('x', blockX + 10)
            .attr('y', blockStartY + 2)
            .attr('fill', 'white')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'system-ui, -apple-system, sans-serif')
            .style('pointer-events', 'none')
            .text(labelText);
        }
      });
    }

    // Draw participants
    participantIds.forEach((participantId, index) => {
      const participant = data.participants[participantId];
      const x = startX + index * (participantWidth + horizontalGap);
      const color = getParticipantColor(participantId);
      const headerHeightPx = 50;
      const highlightIntensity = getHighlightIntensity('participant', participantId);

      // Lifeline
      if (data.style?.show_lifelines !== false) {
        svg.append('line')
          .attr('x1', x + participantWidth / 2)
          .attr('y1', startY + headerHeightPx)
          .attr('x2', x + participantWidth / 2)
          .attr('y2', height - bottomHeaderHeight - 20)
          .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' :
                      highlightIntensity === 'secondary' ? '#fcd34d' : '#64748b')
          .attr('stroke-width', highlightIntensity === 'primary' ? 3 : highlightIntensity === 'secondary' ? 2.5 : 2)
          .attr('stroke-dasharray', '6,4')
          .attr('opacity', highlightIntensity === 'none' ? 0.6 : 0.8)
          .style('pointer-events', 'none');
      }

      // Top participant header
      const headerGroup = svg.append('g')
        .style('cursor', 'pointer')
        .on('click', function(event) {
          event.stopPropagation();
          setHighlighted({ elements: [{ type: 'participant', id: participantId }] });
        });

      // Header background
      headerGroup.append('rect')
        .attr('x', x)
        .attr('y', startY)
        .attr('width', participantWidth)
        .attr('height', headerHeightPx)
        .attr('rx', 8)
        .attr('fill', highlightIntensity === 'primary' ? color + '40' :
                    highlightIntensity === 'secondary' ? color + '30' : color + '20')
        .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' :
                    highlightIntensity === 'secondary' ? '#fcd34d' : color)
        .attr('stroke-width', highlightIntensity === 'primary' ? 3 : highlightIntensity === 'secondary' ? 2.5 : 2);

      // Highlight effect
      if (highlightIntensity !== 'none') {
        headerGroup.append('rect')
          .attr('x', x - 2)
          .attr('y', startY - 2)
          .attr('width', participantWidth + 4)
          .attr('height', headerHeightPx + 4)
          .attr('fill', 'none')
          .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' : '#fcd34d')
          .attr('stroke-width', highlightIntensity === 'primary' ? 3 : 2)
          .attr('rx', 10)
          .attr('filter', highlightIntensity === 'primary' ? 'url(#glow)' : null);
      }

      // Label
      headerGroup.append('text')
        .attr('x', x + participantWidth / 2)
        .attr('y', startY + headerHeightPx / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '13px')
        .attr('font-weight', highlightIntensity === 'primary' ? '700' : highlightIntensity === 'secondary' ? '600' : 'bold')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .style('pointer-events', 'none')
        .text(participant.label);

      // Description
      if (participant.description) {
        headerGroup.append('text')
          .attr('x', x + participantWidth / 2)
          .attr('y', startY + headerHeightPx - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', color)
          .attr('font-size', '10px')
          .attr('font-family', 'system-ui, -apple-system, sans-serif')
          .attr('opacity', 0.8)
          .style('pointer-events', 'none')
          .text(participant.description);
      }
    });

    // Draw messages
    sortedMessages.forEach((message, index) => {
      const fromIndex = participantIds.indexOf(message.from);
      const toIndex = participantIds.indexOf(message.to);

      if (fromIndex === -1 || toIndex === -1) {
        console.warn(`Skipping message ${message.id}: missing participant`);
        return;
      }

      const x1 = startX + fromIndex * (participantWidth + horizontalGap) + participantWidth / 2;
      const x2 = startX + toIndex * (participantWidth + horizontalGap) + participantWidth / 2;
      const y = startY + headerHeight + index * messageSpacing;
      const highlightIntensity = getHighlightIntensity('message', message.id);

      const arrowType = message.arrow_type || 'solid';
      let strokeDasharray: string | undefined;
      if (arrowType === 'dashed' || arrowType === 'open_dashed') {
        strokeDasharray = '6,4';
      } else if (arrowType === 'dot') {
        strokeDasharray = '2,2';
      }

      // Message group for click handling
      const messageGroup = svg.append('g')
        .style('cursor', 'pointer')
        .on('click', function(event) {
          event.stopPropagation();
          setHighlighted({ elements: [{ type: 'message', id: message.id }] });
        });

      // Draw message line
      const markerRef = highlightIntensity !== 'none'
        ? `url(#arrow-${message.from}-${arrowType}-highlighted)`
        : `url(#arrow-${message.from}-${arrowType})`;

      messageGroup.append('line')
        .attr('x1', x1)
        .attr('y1', y)
        .attr('x2', x2)
        .attr('y2', y)
        .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' :
                    highlightIntensity === 'secondary' ? '#fcd34d' : '#475569')
        .attr('stroke-width', highlightIntensity === 'primary' ? 3 : highlightIntensity === 'secondary' ? 2.5 : 2)
        .attr('marker-end', markerRef);

      if (strokeDasharray) {
        messageGroup.select('line').attr('stroke-dasharray', strokeDasharray);
      }

      // Message label
      if (message.label) {
        const labelWidth = Math.max(message.label.length * 7 + 24, 60);
        const labelX = (x1 + x2) / 2;

        messageGroup.append('rect')
          .attr('x', labelX - labelWidth / 2)
          .attr('y', y - 11)
          .attr('width', labelWidth)
          .attr('height', 22)
          .attr('rx', 5)
          .attr('fill', highlightIntensity === 'primary' ? '#fbbf24' :
                      highlightIntensity === 'secondary' ? '#fef3c7' : '#1e293b')
          .attr('stroke', highlightIntensity === 'primary' ? '#f59e0b' :
                      highlightIntensity === 'secondary' ? '#fcd34d' : '#334155')
          .attr('stroke-width', highlightIntensity === 'primary' ? 2 : highlightIntensity === 'secondary' ? 1.5 : 1);

        messageGroup.append('text')
          .attr('x', labelX)
          .attr('y', y + 5)
          .attr('text-anchor', 'middle')
          .attr('fill', highlightIntensity === 'secondary' ? '#1e293b' : '#f8fafc')
          .attr('font-size', '12px')
          .attr('font-weight', highlightIntensity === 'primary' ? '700' : highlightIntensity === 'secondary' ? '600' : '500')
          .attr('font-family', 'system-ui, -apple-system, sans-serif')
          .style('pointer-events', 'none')
          .text(message.label);
      }
    });

    // Draw bottom participant headers
    const bottomY = height - bottomHeaderHeight;
    participantIds.forEach((participantId, index) => {
      const participant = data.participants[participantId];
      const x = startX + index * (participantWidth + horizontalGap);
      const color = getParticipantColor(participantId);
      const highlightIntensity = getHighlightIntensity('participant', participantId);
      const bottomHeaderHeightPx = 40;

      const bottomHeaderGroup = svg.append('g')
        .style('cursor', 'pointer')
        .on('click', function(event) {
          event.stopPropagation();
          setHighlighted({ elements: [{ type: 'participant', id: participantId }] });
        });

      bottomHeaderGroup.append('rect')
        .attr('x', x)
        .attr('y', bottomY)
        .attr('width', participantWidth)
        .attr('height', bottomHeaderHeightPx)
        .attr('rx', 8)
        .attr('fill', highlightIntensity === 'primary' ? color + '35' :
                    highlightIntensity === 'secondary' ? color + '25' : color + '15')
        .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' :
                    highlightIntensity === 'secondary' ? '#fcd34d' : color)
        .attr('stroke-width', highlightIntensity === 'primary' ? 3 : highlightIntensity === 'secondary' ? 2.5 : 2)
        .attr('opacity', 0.9);

      // Highlight effect for bottom
      if (highlightIntensity !== 'none') {
        bottomHeaderGroup.append('rect')
          .attr('x', x - 2)
          .attr('y', bottomY - 2)
          .attr('width', participantWidth + 4)
          .attr('height', bottomHeaderHeightPx + 4)
          .attr('fill', 'none')
          .attr('stroke', highlightIntensity === 'primary' ? '#fbbf24' : '#fcd34d')
          .attr('stroke-width', highlightIntensity === 'primary' ? 3 : 2)
          .attr('rx', 10)
          .attr('filter', highlightIntensity === 'primary' ? 'url(#glow)' : null);
      }

      bottomHeaderGroup.append('text')
        .attr('x', x + participantWidth / 2)
        .attr('y', bottomY + bottomHeaderHeightPx / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '12px')
        .attr('font-weight', highlightIntensity === 'primary' ? '700' : highlightIntensity === 'secondary' ? '600' : '600')
        .attr('font-family', 'system-ui, -apple-system, sans-serif')
        .style('pointer-events', 'none')
        .text(participant.label);
    });

    // Update node dimensions
    if (svgRef.current) {
      svgRef.current.style.width = `${width}px`;
      svgRef.current.style.height = `${height}px`;
    }
  }, [data, highlighted, relatedElements]);

  return (
    <div className="sequence-diagram-container">
      <svg
        ref={svgRef}
        className="sequence-diagram-svg"
        style={{ display: 'block' }}
        onClick={handleSvgClick}
      ></svg>
    </div>
  );
};

export default SequenceDiagramD3;
