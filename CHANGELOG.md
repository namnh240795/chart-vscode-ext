# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-02-10

### Added - Sequence Diagram Enhancements

#### Sequence Blocks Support
- **Alt blocks**: Show alternative execution paths with different conditions
  - Each alt section displays only the participants involved in that specific path
  - Visual distinction between different conditions with labeled sections
- **Opt blocks**: Show optional flows that may or may not execute
- **Loop blocks**: Show iterative/repeating processes
- **Par blocks**: Show parallel operations occurring simultaneously
- **Critical blocks**: Highlight critical sections
- **Neg blocks**: Show negative/exception flows

#### Interactive Highlighting (All Diagram Types)
- **Relational highlighting**: Click any element to highlight all related elements
  - Sequence: Click participant → highlights all messages to/from that participant
  - Sequence: Click message → highlights message, arrow, and sender/receiver participants
  - Sequence: Click block → highlights block, all messages, and involved participants
  - ERD: Click model → highlights all related models and relationships
  - Flow: Click node/edge → highlights connected elements
- **Primary highlight** (directly clicked): Bright yellow glow with thicker borders
- **Secondary highlight** (related elements): Lighter yellow with medium borders
- Click empty space to clear all highlights

#### Sequence Diagram Visual Improvements
- **Participants at both top and bottom**: Headers now appear at both ends of lifelines
- **Simplified participant design**: Removed actor icons, unified visual style for all participants
- **Improved arrow rendering**: Fixed arrow markers to properly display when highlighted
- **Enhanced message styling**: Better contrast and larger fonts for message labels
- **Alt block section rendering**: Each section spans only its relevant participants

#### Technical Improvements
- **D3.js integration**: Sequence diagrams now use D3.js for precise rendering
- **Better spacing**: Increased message spacing for improved readability
- **System font family**: Consistent text rendering across platforms

### Fixed
- Arrow markers disappearing when clicking on messages
- Glow filter interference with marker rendering
- Alt blocks spanning all participants instead of section-specific participants
- Participant header positioning and sizing issues

### Changed
- Sequence diagrams no longer show actor icons - all participants use clean rectangular headers
- Highlight colors changed from blue to yellow for better visibility
- Message spacing increased from 60px to 65px

## [0.0.2] - Previous Release

### Features
- ERD diagram visualization from Prisma schemas
- Flow diagram support with auto-layout
- Basic sequence diagram support
- YAML/CRYML file format support
- Export Prisma to YAML

### File Formats
- `.prisma` - Prisma schema files
- `.yml`, `.yaml` - YAML schema files
- `.cryml` - Custom YAML schema files
