# Chart VS Code Extension

A Visual Studio Code extension for visualizing database schemas (ERD) and flow diagrams using React Flow. Supports Prisma schemas and custom YAML/CRYML files.

## Features

- 🗃️ **ERD Diagrams** - Visualize your database schema with automatic layout
- 📊 **Flow Diagrams** - Create flowcharts with Start, End, Process, Decision, and Note nodes
- 🔀 **Sequence Diagrams** - Show interactions between actors/participants over time
- 🎨 **Color-Coded Groups** - Organize elements with color-based grouping
- 🔍 **Interactive Navigation** - Click nodes/edges to highlight relationships
- 📝 **Multiple Formats** - Support for Prisma, YAML, and CRYML files
- 💾 **Export to YAML** - Convert Prisma schemas to YAML format
- ⚡ **Auto-Layout** - ELK-based automatic layout with manual positioning support

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm run compile
   ```
4. Press F5 in VS Code to launch the extension in a new window

## Usage

### Opening Prisma Schema Files

There are two ways to open a Prisma schema:

#### Method 1: From File Explorer (Recommended)
1. Open the File Explorer panel in VS Code
2. Navigate to your project folder
3. Find your Prisma schema file (usually at `prisma/schema.prisma`)
4. **Right-click** on the `.prisma` file
5. Select **"Open Prisma Schema"** from the context menu
6. A new tab will open displaying your database schema as an interactive ERD diagram

#### Method 2: From Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette
2. Type and select **"Chart: Open Prisma Schema"**
3. A file picker dialog will appear
4. Navigate to and select your `.prisma` file
5. The diagram will open in a new tab

#### What You'll See
- **Interactive Diagram**: Your models displayed as cards with fields listed
- **Relationship Lines**: Lines connecting related models with relation labels
- **Color Coding**: Each model can have a different color for easy identification
- **Field Indicators**:
  - 🟡 **Yellow badge** = Primary Key (PK)
  - 🔵 **Blue badge** = Foreign Key (FK)
  - 🟢 **Green badge** = Unique field
- **Info Panel**: Top-left panel showing schema statistics
- **Controls**: Zoom in/out, fit to view, mini-map in the bottom-right corner

#### Interacting with the Diagram
- **Click a model**: Highlights the model and all its relationships
- **Click a field**: Highlights the specific relationship (if it's a relation field)
- **Drag models**: Rearrange the layout manually
- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag on empty space to move around

#### Exporting Prisma to YAML
After opening a Prisma schema, you can export it to YAML format:

1. With the Prisma diagram open, locate the **"Save as YAML"** button in the top-left info panel
2. Click the button
3. A save dialog will appear
4. Choose a location and filename (e.g., `my-schema.cryml`)
5. The schema will be saved in CRYML format that you can edit manually

### Opening YAML/CRYML Files

#### Method 1: From File Explorer
1. Open the File Explorer panel in VS Code
2. Find your `.yml`, `.yaml`, or `.cryml` file
3. **Right-click** on the file
4. Select **"Open YAML/Cryml Schema"** from the context menu
5. The diagram will open based on the `diagram_type` in the file:
   - `diagram_type: "erd"` → Database schema visualization
   - `diagram_type: "flow"` → Flow diagram visualization
   - `diagram_type: "sequence"` → Sequence diagram visualization

#### Method 2: From Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type and select **"Chart: Open YAML Schema"**
3. Navigate to and select your YAML file
4. The diagram will open in a new tab

### Opening Example Diagrams

The extension comes with built-in examples:

1. Open the **Explorer** sidebar in VS Code
2. Look for the **"Chart VS Code"** section in the sidebar
3. Expand the **"Examples"** folder
4. Double-click on any example to open it:
   - **Order Processing Flow (Flow)** - Demonstrates flow diagram with decisions
   - **Simple E-Commerce (ERD)** - Demonstrates database schema
   - **Quick Reference** - Quick syntax reference guide

### Validating CRYML Files

Before opening a CRYML file, you can validate its syntax:

1. Open the `.cryml` file in the editor
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type and select **"Chart: Validate CRYML File"**
4. You'll see a notification:
   - ✅ "✓ Valid ERD diagram"
   - ✅ "✓ Valid FLOW diagram"
   - ✅ "✓ Valid SEQUENCE diagram"
   - ❌ Error message if something is invalid

### Tips and Tricks

**Multiple Diagrams**: You can open multiple diagrams at once. Each one opens in its own tab, and you can switch between them.

**Auto-Layout vs Manual**: In flow diagrams, if you don't specify `position` for nodes, the extension will automatically arrange them using the ELK layout algorithm. If you want full control, add `position` to each node.

**Keyboard Shortcuts**:
- `Ctrl+S` / `Cmd+S` - Save (works for YAML export)
- `Ctrl++` / `Cmd++` - Zoom in
- `Ctrl+-` / `Cmd+-` - Zoom out
- `Ctrl+0` / `Cmd+0` - Fit to view

## ERD Diagram Syntax

ERD diagrams allow you to visualize your database schema with models, fields, and relationships.

### Basic Structure

```yaml
diagram_type: "erd"

metadata:
  name: "My E-Commerce Schema"
  description: "Database schema for online store"
  version: "1.0"

style:
  default_color: "yellow"

models:
  User:
    color: "blue"
    fields:
      id:
        type: "Int"
        is_id: true
        is_unique: true
      email:
        type: "String"
        is_unique: true
      posts:
        type: "Post[]"
        relation_to_model: "Post"

  Post:
    color: "teal"
    fields:
      id:
        type: "Int"
        is_id: true
      title:
        type: "String"
      author:
        type: "User"
        is_foreign_key: true
        references_field: "id"
        relation_to_model: "User"
```

### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of your schema |
| `description` | string | No | Description of the schema |
| `version` | string | No | Version number |

### Style Options

| Option | Type | Values | Default |
|--------|------|--------|---------|
| `default_color` | string | `yellow`, `red`, `teal` | `yellow` |

### Model Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `color` | string | No | Model color: `yellow`, `red`, `teal` |
| `fields` | object | Yes | Field definitions |

### Field Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | string | Data type (e.g., `Int`, `String`, `Boolean`) |
| `is_id` | boolean | Mark as primary key |
| `is_unique` | boolean | Mark as unique field |
| `is_foreign_key` | boolean | Mark as foreign key |
| `references_field` | string | Referenced field name |
| `relation_to_model` | string | Related model name |
| `is_optional` | boolean | Field can be null |
| `default_value` | any | Default value |

### Field Types

- **Scalar Types**: `Int`, `String`, `Boolean`, `Float`, `DateTime`, `Json`
- **Array Types**: `Int[]`, `String[]`, `Post[]`
- **Enum Types**: Reference to enum definition
- **Relations**: Use model name for one-to-one, `Model[]` for one-to-many

### Enums

```yaml
enums:
  UserRole:
    values:
      - ADMIN
      - USER
      - GUEST
```

### Complete ERD Example

```yaml
diagram_type: "erd"

metadata:
  name: "Simple E-Commerce"
  description: "Basic e-commerce database schema"

models:
  User:
    color: "blue"
    fields:
      id:
        type: "Int"
        is_id: true
        is_unique: true
      email:
        type: "String"
        is_unique: true
      name:
        type: "String"
      role:
        type: "UserRole"
        default_value: "USER"
      orders:
        type: "Order[]"
        relation_to_model: "Order"

  Product:
    color: "teal"
    fields:
      id:
        type: "Int"
        is_id: true
        is_unique: true
      name:
        type: "String"
      price:
        type: "Float"
      stock:
        type: "Int"

  Order:
    color: "yellow"
    fields:
      id:
        type: "Int"
        is_id: true
        is_unique: true
      user:
        type: "User"
        is_foreign_key: true
        references_field: "id"
        relation_to_model: "User"
      total:
        type: "Float"
      status:
        type: "OrderStatus"

enums:
  UserRole:
    values:
      - ADMIN
      - USER
      - GUEST

  OrderStatus:
    values:
      - PENDING
      - PAID
      - SHIPPED
      - DELIVERED
```

## Flow Diagram Syntax

Flow diagrams allow you to create process flows with decision nodes and multiple branching paths.

### Basic Structure

```yaml
diagram_type: "flow"

metadata:
  name: "My Process Flow"
  description: "Description of the process"

style:
  default_color: "blue"
  node_size: "medium"

nodes:
  start_node:
    type: "start"
    label: "Start"
    group: "Group A"

  process_node:
    type: "process"
    label: "Do Something"
    description: "Detailed description"
    group: "Group B"
    position:
      x: 400
      y: 200

  decision_node:
    type: "decision"
    label: "Continue?"
    group: "Group C"

  note_node:
    type: "note"
    label: "Note"
    description: "Additional information"
    group: "Group D"

  end_node:
    type: "end"
    label: "End"
    group: "Group E"

edges:
  - from: "start_node"
    to: "process_node"
    label: "begin"

  - from: "process_node"
    to: "decision_node"
    label: "done"

  - from: "decision_node"
    to: "end_node"
    label: "yes"

groups:
  Group A:
    color: "green"
  Group B:
    color: "blue"
```

### Node Types

#### Start Node
- **Type**: `start`
- **Purpose**: Entry point of the flow
- **Handles**: Source (bottom) only
- **Color**: Green

```yaml
start:
  type: "start"
  label: "Order Received"
  group: "Customer"
```

#### End Node
- **Type**: `end`
- **Purpose**: Exit point of the flow
- **Handles**: Target (top) only
- **Color**: Red

```yaml
end_success:
  type: "end"
  label: "Complete"
  description: "Process finished"
  group: "Completion"
```

#### Process Node
- **Type**: `process`
- **Purpose**: Action or operation
- **Handles**: Target (top), Source (bottom)
- **Color**: Custom per group

```yaml
process_payment:
  type: "process"
  label: "Charge Credit Card"
  description: "Process via payment gateway"
  group: "Payment"
```

#### Decision Node
- **Type**: `decision`
- **Purpose**: Branching point with yes/no logic
- **Handles**: Target (top), Source (left=yes, right=no, bottom)
- **Shape**: Diamond
- **Color**: Orange

```yaml
validate_payment:
  type: "decision"
  label: "Payment Valid?"
  group: "Payment"
```

**Decision Edge Labels**:
- `yes`, `true`, `valid` → Routes to left handle (green)
- `no`, `false`, `invalid` → Routes to right handle (red)
- `bottom`, `continue` → Routes to bottom handle (orange)

#### Note Node
- **Type**: `note`
- **Purpose**: Annotation or reference information
- **Handles**: Target (top), Source (bottom)
- **Color**: Yellow

```yaml
validate_payment_note:
  type: "note"
  label: "Payment Validation"
  description: "Checks if:\n- Card number is valid\n- CVV matches\n- Expiration date is in future"
  group: "Payment"
```

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Node type: `start`, `end`, `process`, `decision`, `note` |
| `label` | string | Yes | Display text for the node |
| `description` | string | No | Additional details (supports `\n` for line breaks) |
| `group` | string | No | Group name for color coding |
| `position` | object | No | Manual position (overrides auto-layout) |

### Position Object

```yaml
position:
  x: 400  # Horizontal position
  y: 200  # Vertical position
```

If no position is specified, the ELK layout algorithm will automatically position nodes.

### Edge Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `from` | string | Yes | Source node ID |
| `to` | string | Yes | Target node ID |
| `label` | string | No | Edge label (important for decisions!) |

### Group Colors

Available colors for groups:

| Color | Hex | Usage |
|-------|-----|-------|
| `blue` | #3b82f6 | Default, general |
| `green` | #10b981 | Start, success |
| `red` | #ef4444 | End, errors |
| `orange` | #f97316 | Decisions |
| `purple` | #8b5cf6 | Special |
| `gray` | #6b7280 | Neutral |

### Style Options

| Option | Type | Values | Default |
|--------|------|--------|---------|
| `default_color` | string | `blue`, `green`, `red`, `orange`, `purple`, `gray` | `blue` |
| `node_size` | string | `small`, `medium`, `large` | `medium` |

### Complete Flow Example

```yaml
diagram_type: "flow"

metadata:
  name: "Order Processing Flow"
  description: "Complete order processing from customer to delivery"

style:
  default_color: "blue"
  node_size: "medium"

nodes:
  start:
    type: "start"
    label: "Order Received"
    group: "Customer"
    position:
      x: 400
      y: 50

  validate_payment:
    type: "decision"
    label: "Payment Valid?"
    group: "Payment"
    position:
      x: 400
      y: 180

  validate_payment_note:
    type: "note"
    label: "Payment Validation"
    description: "Checks if:\n- Card number is valid\n- CVV matches\n- Expiration date is in future"
    group: "Payment"
    position:
      x: 620
      y: 180

  process_payment:
    type: "process"
    label: "Charge Credit Card"
    description: "Process via payment gateway"
    group: "Payment"
    position:
      x: 400
      y: 320

  check_inventory:
    type: "decision"
    label: "In Stock?"
    description: "Verify inventory availability"
    group: "Inventory"
    position:
      x: 400
      y: 460

  reserve_items:
    type: "process"
    label: "Reserve Items"
    description: "Set aside inventory"
    group: "Inventory"
    position:
      x: 400
      y: 600

  ship_order:
    type: "process"
    label: "Ship Order"
    description: "Package and ship via courier"
    group: "Fulfillment"
    position:
      x: 400
      y: 740

  notify_success:
    type: "process"
    label: "Send Confirmation"
    description: "Email order confirmation"
    group: "Communication"
    position:
      x: 400
      y: 880

  notify_failure:
    type: "process"
    label: "Send Error"
    description: "Notify customer of issue"
    group: "Communication"
    position:
      x: 120
      y: 320

  end_success:
    type: "end"
    label: "Order Complete"
    description: "Process finished successfully"
    group: "Completion"
    position:
      x: 400
      y: 1000

  end_failure:
    type: "end"
    label: "Order Failed"
    description: "Process terminated"
    group: "Completion"
    position:
      x: 120
      y: 480

edges:
  - from: "start"
    to: "validate_payment"
    label: "new order"

  - from: "validate_payment"
    to: "process_payment"
    label: "valid"

  - from: "validate_payment"
    to: "notify_failure"
    label: "invalid"

  - from: "process_payment"
    to: "check_inventory"
    label: "authorized"

  - from: "check_inventory"
    to: "reserve_items"
    label: "yes"

  - from: "check_inventory"
    to: "notify_failure"
    label: "no"

  - from: "reserve_items"
    to: "ship_order"
    label: "reserved"

  - from: "ship_order"
    to: "notify_success"
    label: "shipped"

  - from: "notify_success"
    to: "end_success"
    label: "confirmed"

  - from: "notify_failure"
    to: "end_failure"
    label: "notified"

groups:
  Customer:
    color: "green"
  Payment:
    color: "blue"
  Inventory:
    color: "orange"
  Fulfillment:
    color: "purple"
  Communication:
    color: "gray"
  Completion:
    color: "red"
```

## Sequence Diagram Syntax

Sequence diagrams allow you to visualize interactions between actors/participants over time.

### Basic Structure

```yaml
diagram_type: "sequence"

metadata:
  name: "User Authentication Flow"
  description: "A sequence diagram showing authentication process"

style:
  default_color: "blue"
  participant_width: 150
  show_lifelines: true
  show_activations: true

participants:
  user:
    type: actor
    label: "User"
    description: "End user"
    color: "green"
    order: 0

  frontend:
    type: participant
    label: "Frontend App"
    description: "Web application"
    color: "blue"
    order: 1

messages:
  - id: msg1
    from: user
    to: frontend
    label: "Enter credentials"
    arrow_type: solid
    sequence_order: 1

  - id: msg2
    from: frontend
    to: user
    label: "Login success"
    arrow_type: dashed
    sequence_order: 2
```

### Participant Types

#### Actor
- **Type**: `actor`
- **Purpose**: Represents a human user or external system
- **Visual**: Stick figure icon + label

```yaml
user:
  type: actor
  label: "User"
  description: "End user"
  color: "green"
  order: 0
```

#### Participant
- **Type**: `participant`
- **Purpose**: Represents a system component, service, or database
- **Visual**: Rectangle box with label

```yaml
api:
  type: participant
  label: "API Server"
  description: "REST API"
  color: "purple"
  order: 1
```

### Participant Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | `actor` or `participant` |
| `label` | string | Yes | Display name |
| `description` | string | No | Additional details |
| `color` | string | No | Color theme |
| `order` | number | No | Horizontal position (0-indexed) |

### Arrow Types

| Type | Description | Usage |
|------|-------------|-------|
| `solid` | Solid line with filled arrow | Synchronous calls |
| `dashed` | Dashed line with open arrow | Asynchronous responses |
| `open_solid` | Solid line with open arrow | One-way message |
| `open_dashed` | Dashed line with open arrow | One-way async message |
| `dot` | Line with dot endpoint | Callback/notification |

### Message Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique message identifier |
| `from` | string | Yes | Source participant ID |
| `to` | string | Yes | Target participant ID |
| `label` | string | Yes | Message text |
| `arrow_type` | string | No | Arrow style (default: `solid`) |
| `note` | string | No | Optional note attached to message |
| `sequence_order` | number | Yes | Vertical position (time order) |

### Style Options

| Option | Type | Values | Default |
|--------|------|--------|---------|
| `default_color` | string | `blue`, `green`, `red`, `orange`, `purple`, `gray`, `yellow`, `teal` | `blue` |
| `participant_width` | number | Any positive integer | `150` |
| `show_lifelines` | boolean | `true`, `false` | `true` |
| `show_activations` | boolean | `true`, `false` | `true` |

### Available Colors

| Color | Hex | Usage |
|-------|-----|-------|
| `blue` | #3b82f6 | Default, general components |
| `green` | #10b981 | Actors, success states |
| `red` | #ef4444 | Errors, critical components |
| `orange` | #f97316 | Warnings, important services |
| `purple` | #8b5cf6 | Special services |
| `gray` | #6b7280 | Neutral components |
| `yellow` | #fbbf24 | Notes, auxiliary |
| `teal` | #14b8a6 | Databases, storage |

### Complete Sequence Example

```yaml
diagram_type: "sequence"

metadata:
  name: "User Authentication Flow"
  description: "A sequence diagram showing the user authentication process"
  version: "1.0"

style:
  default_color: blue
  participant_width: 150
  show_lifelines: true
  show_activations: true

participants:
  user:
    type: actor
    label: "User"
    description: "End user"
    color: green
    order: 0

  frontend:
    type: participant
    label: "Frontend App"
    description: "Web application"
    color: blue
    order: 1

  api:
    type: participant
    label: "API Server"
    description: "REST API"
    color: purple
    order: 2

  database:
    type: participant
    label: "Database"
    description: "PostgreSQL"
    color: orange
    order: 3

messages:
  # User login flow
  - id: msg1
    from: user
    to: frontend
    label: "Enter credentials"
    arrow_type: solid
    sequence_order: 1

  - id: msg2
    from: frontend
    to: api
    label: "POST /login"
    arrow_type: solid
    sequence_order: 2

  - id: msg3
    from: api
    to: database
    label: "Query user"
    arrow_type: solid
    sequence_order: 3

  - id: msg4
    from: database
    to: api
    label: "User data"
    arrow_type: dashed
    sequence_order: 4

  - id: msg5
    from: api
    to: frontend
    label: "JWT token"
    arrow_type: dashed
    sequence_order: 5

  - id: msg6
    from: frontend
    to: user
    label: "Login success"
    arrow_type: solid
    sequence_order: 6
```

## Interactive Features

### Click to Highlight
- **ERD Diagrams**: Click a model to highlight all related models and relationships
- **Flow Diagrams**: Click a node to highlight connected nodes and edges
- **Edges**: Click an edge to highlight it and its connected nodes

### Visual Feedback
- Selected nodes have a ring highlight
- Connected edges become animated and thicker
- Connected nodes are highlighted
- Color-coded by group

## File Extensions

- `.prisma` - Prisma schema files
- `.yml` - YAML schema files
- `.yaml` - YAML schema files
- `.cryml` - Custom YAML schema files (same as YAML)

## Validation

Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run:
```
Validate CRYML File
```

This will check your YAML file for:
- Correct diagram type
- Required metadata fields
- Valid node types (for flow diagrams)
- Required fields (models for ERD, nodes for flow)

## Examples

Check out the `examples/` directory for complete examples:
- `flow-order-processing.cryml` - Order processing flow diagram
- `simple-ecommerce.cryml` - E-commerce database schema
- `sequence-example.cryml` - User authentication sequence diagram
- `quick-reference.cryml` - Quick reference guide

## Development

For development documentation, architecture guide, and contribution guidelines, see [DEVELOPMENT.md](./DEVELOPMENT.md).

**Quick start**:
```bash
# Install dependencies
pnpm install

# Compile extension
pnpm run compile

# Watch for changes during development
pnpm run watch

# Press F5 in VS Code to launch Extension Development Host
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Architecture overview and data flow
- File structure guide
- Common development tasks (adding nodes, colors, features)
- Testing procedures
- Build and deployment instructions
- Troubleshooting guide

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
