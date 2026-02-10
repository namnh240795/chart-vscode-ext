# Development Guide

This guide helps you understand how the extension works and how to work on it continuously.

## Quick Overview

**Chart & Flow Diagrams** is a VS Code extension that visualizes:
- **ERD diagrams** - Database schemas (Prisma, YAML)
- **Flow diagrams** - Process flows with decisions

Built with: **React Flow** + **TypeScript** + **ELK.js** (auto-layout)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| VS Code API | `vscode` | Extension host, commands, webviews |
| UI Framework | `React 19` + `React Flow 11` | Interactive diagram visualization |
| Language | `TypeScript` | Type-safe development |
| Styling | `Tailwind CSS 4` | Utility-first styling |
| Layout | `ELK.js` | Automatic graph layout |
| Parsing | `yaml`, `js-yaml` | YAML schema parsing |
| Bundling | `Webpack 5` | Separate builds for extension + webview |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                  │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  extension.ts    │────────▶│  WebviewPanelProvider    │ │
│  │  - Commands      │         │  - Message handling      │ │
│  │  - Sidebar       │         │  - Panel lifecycle       │ │
│  │  - Validation    │         └──────────────────────────┘ │
│  └──────────────────┘                    │                │
│                                               │              │
│                    VS Code API              │              │
│                    (messages)               ▼              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                  React Webview App                   │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │  App.tsx (Root)                                │  │ │
│  │  │  - Diagram type routing (ERD vs Flow)          │  │ │
│  │  │  - Node/edge selection state                   │  │ │
│  │  │  - React Flow configuration                    │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │                           │                           │ │
│  │           ┌───────────────┴───────────────┐          │ │
│  │           ▼                               ▼          │ │
│  │  ┌─────────────────┐          ┌──────────────────┐  │ │
│  │  │ ERD Diagram     │          │ Flow Diagram     │  │ │
│  │  │ - PrismaModel   │          │ - Start/End      │  │ │
│  │  │ - PrismaEnum    │          │ - Process        │  │ │
│  │  │ - Relations     │          │ - Decision       │  │ │
│  │  └─────────────────┘          │ - Note           │  │ │
│  │                                └──────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │         Parsers & Transformers          │
         │  ┌──────────┐    ┌─────────────────┐   │
         │  │  Prisma  │───▶│ Prisma → YAML   │   │
         │  │  Parser  │    │   Transformer   │   │
         │  └──────────┘    └─────────────────┘   │
         │  ┌──────────┐    ┌─────────────────┐   │
         │  │   YAML   │───▶│  YAML → React   │   │
         │  │  Parser  │    │    Flow         │   │
         │  └──────────┘    └─────────────────┘   │
         │  ┌──────────┐                           │
         │  │   Flow   │───▶ Flow → React Flow    │
         │  │  Parser  │                           │
         │  └──────────┘                           │
         └─────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  ELK Layout      │
                    │  - Auto-layout   │
                    │  - Manual pos.   │
                    └──────────────────┘
```

---

## File Structure

```
chart-vscode-ext/
├── src/
│   ├── extension.ts              # 🎯 Extension entry point
│   │                              #   - Registers commands
│   │                              #   - Creates webview panels
│   │                              #   - Handles validation
│   │
│   └── webview/                   # 🖼️  React webview app
│       ├── App.tsx                #   - Root component
│       ├── index.tsx              #   - React entry point
│       │
│       ├── components/            # 🧩 React components
│       │   ├── PrismaModelNode.tsx   # ERD model card
│       │   ├── PrismaEnumNode.tsx    # ERD enum display
│       │   └── FlowNodes.tsx         # Flow diagram nodes
│       │                              #   (start, end, process, decision, note)
│       │
│       ├── parsers/               # 📄 Schema parsers
│       │   ├── prismaParser.ts       # Prisma → React Flow
│       │   └── flowParser.ts         # YAML Flow → React Flow
│       │
│       ├── types/                 # 📐 TypeScript definitions
│       │   └── diagrams.ts           # All diagram types
│       │
│       ├── validators/            # ✅ Schema validation
│       │   ├── diagramValidator.ts   # Main validator
│       │   ├── structureValidator.ts # Structure validation
│       │   ├── referenceValidator.ts # Reference checking
│       │   └── types.ts              # Validation types
│       │
│       ├── elkLayout.ts           # 📐 Auto-layout engine
│       ├── yamlParser.ts          # 📄 YAML → Diagram objects
│       ├── yamlTransformer.ts     # 🔄 Prisma → YAML converter
│       ├── global.d.ts            # 🔧 Global type declarations
│       └── styles.css             # 🎨 Global styles
│
├── examples/                     # 📚 Example diagrams
│   ├── flow-order-processing.cryml   # Complete flow example
│   ├── simple-ecommerce.cryml        # ERD example
│   └── quick-reference.cryml         # Syntax reference
│
├── syntaxes/
│   └── cryml.tmLanguage.json    # 🔤 Syntax highlighting
│
├── language-configuration.json   # 🔤 Language config
│
├── webpack.config.js             # 📦 Extension bundler
├── webpack.webview.config.js     # 📦 Webview bundler
├── tsconfig.json                 # ⚙️  TypeScript config (extension)
├── tsconfig.webview.json         # ⚙️  TypeScript config (webview)
│
├── package.json                  # 📋 Extension manifest
├── README.md                     # 📖 User documentation
├── DEVELOPMENT.md                # 📖 This file
├── PUBLISHING.md                 # 🚀 Publishing guide
└── LICENSE                       # ⚖️  MIT License
```

---

## Data Flow

### Opening a Prisma Schema

```
User right-clicks schema.prisma
           │
           ▼
extension.ts: openPrismaCommand
           │
           ├─▶ Read file content
           ├─▶ Create webview panel
           └─▶ Send content to webview
                     │
                     ▼
           App.tsx receives initialData
                     │
                     ▼
           prismaParser.parsePrismaSchema()
           │
           ├─▶ Extract models, fields, enums
           ├─▶ Build relation graph
           └─▶ Categorize models (Auth, Content, Config)
                     │
                     ▼
           convertToReactFlowNodes()
           │
           ├─▶ Create React Flow nodes
           ├─▶ Create edges for relations
           └─▶ Apply ELK layout
                     │
                     ▼
           setNodes() / setEdges()
                     │
                     ▼
           React Flow renders interactive diagram
```

### Opening a YAML/CRYML File

```
User right-clicks file.cryml
           │
           ▼
extension.ts: openYamlCommand
           │
           ├─▶ Read file content
           ├─▶ Detect diagram_type
           └─▶ Send content to webview
                     │
                     ▼
           App.tsx receives initialData
                     │
                     ├─▶ diagram_type === "erd"  → yamlParser + ERD renderer
                     └─▶ diagram_type === "flow" → flowParser + Flow renderer
```

### Saving Prisma as YAML

```
User clicks "Save as YAML" button
           │
           ▼
App.tsx sends saveAsYaml message
           │
           ▼
extension.ts: handleSaveAsYaml()
           │
           ├─▶ Show save dialog
           └─▶ Get schema from webview
                     │
                     ▼
           yamlTransformer.prismaToYaml()
           │
           ├─▶ Convert PrismaSchema to YAML string
           └─▶ Write to file
```

---

## Common Development Tasks

### 1. Adding a New Flow Node Type

**Example**: Add a "database" node type for flow diagrams

#### Step 1: Update Types (`src/webview/types/diagrams.ts`)

```typescript
// Update FlowNode type
export type FlowNodeType = 'start' | 'end' | 'process' | 'decision' | 'note' | 'database';

export interface FlowNode {
  type: FlowNodeType;  // Now includes 'database'
  label: string;
  // ... rest
}
```

#### Step 2: Create Component (`src/webview/components/FlowNodes.tsx`)

```typescript
export const DatabaseNode: React.FC<FlowNodeProps> = ({
  data, selected, isSelected, highlighted, onClick
}) => {
  return (
    <div
      className="border-2 rounded cursor-pointer"
      style={{
        backgroundColor: '#e0f2fe',
        borderColor: '#0284c7',
        padding: '12px 16px',
      }}
      onClick={onClick}
    >
      {/* Database cylinder shape */}
      <div className="font-bold">{data.label}</div>
      {data.description && (
        <div className="text-xs">{data.description}</div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
```

#### Step 3: Register Component (`src/webview/App.tsx`)

```typescript
import { DatabaseNode } from './components/FlowNodes';

const nodeTypes = useMemo(() => ({
  prismaModel: PrismaModelNode,
  prismaEnum: PrismaEnumNode,
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
  note: NoteNode,
  database: DatabaseNode,  // Add here
}), []);
```

#### Step 4: Update Validation (`src/extension.ts`)

```typescript
// In validateCrymlCommand
if (!['start', 'end', 'process', 'decision', 'note', 'database'].includes(node.type)) {
  vscode.window.showErrorMessage(`Invalid node type: ${node.type}`);
  return;
}
```

---

### 2. Adding a New Color Scheme

**Example**: Add "pink" color for ERD models

#### Step 1: Update Type (`src/webview/types/diagrams.ts`)

```typescript
export type ModelColor = 'yellow' | 'red' | 'teal' | 'pink';

export const MODEL_COLORS: Record<ModelColor, ModelColorConfig> = {
  yellow: { bg: '#fef9c3', border: '#eab308', text: '#854d0e', badge: '#a16207' },
  red: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', badge: '#b91c1c' },
  teal: { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a', badge: '#0f766e' },
  pink: { bg: '#fce7f3', border: '#ec4899', text: '#9f1239', badge: '#be185d' },
};
```

#### Step 2: Update Parser (`src/webview/parsers/prismaParser.ts`)

```typescript
// Color categorization now includes pink
const getColorByPattern = (modelName: string): ModelColor => {
  const patterns = {
    pink: [/user/i, /profile/i, /account/i],
    // ... other patterns
  };

  for (const [color, regexes] of Object.entries(patterns)) {
    if (regexes.some(regex => regex.test(modelName))) {
      return color as ModelColor;
    }
  }
  return 'yellow';
};
```

---

### 3. Modifying Node Layout

#### Changing ERD Model Node Size

Edit `src/webview/components/PrismaModelNode.tsx`:

```typescript
// Calculate node height based on fields
const nodeHeight = Math.max(
  MIN_HEIGHT,
  HEADER_HEIGHT + FIELD_HEIGHT * fields.length + PADDING
);

// Adjust field height
const FIELD_HEIGHT = 28;  // Increase for more spacing
```

#### Changing Flow Node Dimensions

Edit `src/webview/components/FlowNodes.tsx`:

```typescript
// In ProcessNode - change padding
padding: '12px 16px',  // Increase for larger nodes

// In DecisionNode - adjust calculation
const calculatedWidth = Math.max(minWidth, 120 + labelLength * 4);
// Increase multiplier for wider diamonds
```

---

### 4. Adding Keyboard Shortcuts

Edit `package.json`:

```json
"contributes": {
  "keybindings": [
    {
      "command": "chart-vscode-ext.openPrisma",
      "key": "ctrl+shift+d",
      "mac": "cmd+shift+d",
      "when": "resourceExtname == .prisma"
    },
    {
      "command": "chart-vscode-ext.validateCryml",
      "key": "ctrl+shift+v",
      "mac": "cmd+shift+v",
      "when": "resourceLangId == cryml"
    }
  ]
}
```

---

### 5. Adding Custom Edge Styles

**Example**: Add dashed edges for optional relations

#### Step 1: Create Custom Edge (`src/webview/components/CustomEdge.tsx`)

```typescript
import { EdgeProps, getBezierPath } from 'reactflow';

export const DashedEdge: React.FC<EdgeProps> = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  style = {}, markerEnd,
}) => {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <path
      id={id}
      style={{
        ...style,
        strokeDasharray: '5,5',  // Dashed line
      }}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
    />
  );
};
```

#### Step 2: Register Edge Type (`src/webview/App.tsx`)

```typescript
import { DashedEdge } from './components/CustomEdge';

const edgeTypes = useMemo(() => ({
  dashed: DashedEdge,
  // ... other edge types
}), []);
```

#### Step 3: Use in Parser

```typescript
// In prismaParser.ts or flowParser.ts
const edge: Edge = {
  id,
  source: sourceModel,
  target: targetModel,
  type: relation.isOptional ? 'dashed' : 'default',  // Use dashed for optional
  label: relationName,
};
```

---

## Key Patterns & Conventions

### File Naming

| Pattern | Usage | Example |
|---------|-------|---------|
| `PascalCase.tsx` | React components | `PrismaModelNode.tsx` |
| `camelCase.ts` | Utilities/services | `prismaParser.ts` |
| `kebab-case.cryml` | Example files | `flow-order-processing.cryml` |

### Component Structure

```typescript
// Standard component pattern
export const ComponentName: React.FC<ComponentProps> = ({
  data,      // Node/edge data from React Flow
  selected,  // Built-in React Flow selected state
  isSelected, // Our custom selection state
  highlighted, // Our custom highlight state
  onClick,    // Click handler
}) => {
  // 1. Hooks (useState, useMemo, etc.)
  // 2. Event handlers
  // 3. Render

  return (
    <div onClick={onClick}>
      {/* Content */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
```

### Type Guards

```typescript
// Always use type guards when working with union types
export function isPrismaModel(item: PrismaSchemaItem): item is PrismaModel {
  return item.kind === 'model';
}

// Usage
if (isPrismaModel(item)) {
  // TypeScript knows item is PrismaModel here
  console.log(item.fields);
}
```

### Color Coding

```typescript
// Use centralized color config
import { MODEL_COLORS, ModelColor } from './types/diagrams';

const color = MODEL_COLORS[modelColor];
const style = {
  backgroundColor: color.bg,
  borderColor: color.border,
  color: color.text,
};
```

### Error Handling

```typescript
// In parsers - return null for invalid input
export function parsePrismaSchema(content: string): PrismaSchema | null {
  try {
    // Parse logic
    return schema;
  } catch (error) {
    console.error('Parse error:', error);
    return null;  // Let caller handle null
  }
}

// In extension - show user-friendly messages
try {
  const schema = parsePrismaSchema(content);
  if (!schema) {
    vscode.window.showErrorMessage('Failed to parse Prisma schema');
    return;
  }
} catch (error) {
  vscode.window.showErrorMessage(`Error: ${error.message}`);
}
```

---

## Testing Locally

### Manual Testing Flow

```bash
# 1. Start development watch mode
pnpm run watch

# 2. In VS Code, press F5 to launch Extension Development Host

# 3. In the new window:
#    - Open a test file (schema.prisma or file.cryml)
#    - Right-click → "Open with Chorack"
#    - Verify diagram renders correctly
#    - Test interactions (click nodes, zoom, pan)
```

### Test Files

Create these in `/tmp/test-files/`:

**test-erd.cryml**:
```yaml
diagram_type: "erd"
metadata:
  name: "Test ERD"
models:
  User:
    fields:
      id: { type: "Int", is_id: true, is_unique: true }
      name: { type: "String" }
```

**test-flow.cryml**:
```yaml
diagram_type: "flow"
metadata:
  name: "Test Flow"
nodes:
  start: { type: "start", label: "Start" }
  decision: { type: "decision", label: "Continue?" }
  end: { type: "end", label: "End" }
edges:
  - { from: "start", to: "decision" }
  - { from: "decision", to: "end", label: "yes" }
```

### Common Issues to Test

| Issue | Test Case |
|-------|-----------|
| Empty schema | Open file with no models/nodes |
| Invalid syntax | Try malformed YAML |
| Large diagrams | 50+ models or nodes |
| Deep nesting | Complex relations or long flows |
| Special characters | Models/names with unicode, spaces |

---

## Build & Deploy

### Development Build

```bash
# Fast build with source maps
pnpm run compile:extension
pnpm run compile:webview

# Or watch mode
pnpm run watch
```

### Production Build

```bash
# Minified, optimized
pnpm run compile
```

### Publishing

```bash
# 1. Bump version in package.json
# 2. Build
pnpm run compile

# 3. Package (creates .vsix)
vsce package --no-dependencies

# 4. Test locally
code --install-extension chart-vscode-ext-0.0.2.vsix

# 5. Publish
vsce publish --no-dependencies           # Stable
vsce publish --pre-release --no-dependencies  # Preview
```

See [PUBLISHING.md](./PUBLISHING.md) for full details.

---

## Troubleshooting

### "Module not found" errors

**Problem**: Can't import a module in the webview

**Solution**:
- Extension modules: Check `webpack.config.js` externals
- Webview modules: Check `webpack.webview.config.js` resolve
- Node modules in webview: Add to `webpack.webview.config.js` externals

### React Flow not rendering

**Problem**: Diagram shows blank

**Check**:
1. Browser console (Cmd+Shift+I in webview)
2. Node `type` matches registered `nodeTypes`
3. Nodes have `id` field
4. Edges reference valid node `id`s

### ELK layout not working

**Problem**: Nodes overlap or no layout applied

**Check**:
1. ELK.js is bundled: `webpack.webview.config.js`
2. `elkLayout.ts` is imported
3. Node dimensions are set (for React Flow layout)

### Hot reload not working

**Problem**: Changes don't appear in Extension Development Host

**Solution**:
- Use `pnpm run watch` for automatic rebuilds
- Reload window (Ctrl+R / Cmd+R) after extension code changes
- Restart Extension Development Host for changes in `package.json`

### Type errors after updating

**Problem**: TypeScript errors after dependency update

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm run compile
```

---

## Performance Tips

### Large Diagrams

1. **Virtualization**: React Flow already handles this
2. **Lazy parsing**: Parse only visible diagrams
3. **Debounce layout**: Don't recalculate on every frame

```typescript
// Example: Debounce auto-layout
import { debounce } from 'lodash';

const debouncedLayout = debounce(() => {
  applyElkLayout(nodes, edges);
}, 300);
```

### Memory Management

```typescript
// Clean up on panel dispose
panel.onDidDispose(() => {
  // Clear subscriptions
  disposables.forEach(d => d.dispose());
  // Clear large objects
  setNodes([]);
  setEdges([]);
});
```

---

## Next Steps

### Feature Ideas

1. **Sequence diagrams** - Add as third diagram type
2. **Export to PNG/SVG** - Save diagrams as images
3. **Collapsible groups** - Group nodes in swimlanes
4. **Undo/redo** - History stack for diagram edits
5. **Search/filter** - Find nodes by name
6. **Dark theme** - VS Code theme integration
7. **Diagram templates** - Quick-start templates

### Learning Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [React Flow Docs](https://reactflow.dev/)
- [ELK Layout Documentation](https://www.eclipse.org/elk/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Quick Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `extension.ts` | Extension entry | `openPrismaCommand`, `openYamlCommand`, `validateCrymlCommand` |
| `App.tsx` | React root | Diagram routing, node selection, React Flow config |
| `prismaParser.ts` | Prisma parsing | `parsePrismaSchema`, `convertToReactFlowNodes` |
| `flowParser.ts` | Flow parsing | `parseFlowYaml`, `convertFlowToReactFlow` |
| `yamlParser.ts` | YAML parsing | `parseYamlSchema` |
| `elkLayout.ts` | Auto-layout | `layoutNodes` |
| `PrismaModelNode.tsx` | ERD node | Model card component |
| `FlowNodes.tsx` | Flow nodes | Start/End/Process/Decision/Note components |
| `diagrams.ts` | Types | All diagram type definitions |

---

## Questions?

- Check [README.md](./README.md) for user documentation
- Check [PUBLISHING.md](./PUBLISHING.md) for deployment guide
- Open an issue on [GitHub](https://github.com/namnh240795/chart-vscode-ext/issues)

Happy coding! 🚀
