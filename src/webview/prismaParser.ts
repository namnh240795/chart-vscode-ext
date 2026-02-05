// Prisma Schema Parser
// Parses .prisma files and converts to React Flow nodes and edges

import { Node, Edge, MarkerType } from 'reactflow';
import { layoutWithElk } from './elkLayout';

export interface PrismaField {
  name: string;
  type: string;
  isId: boolean;
  isUnique: boolean;
  isRequired: boolean;
  isList: boolean;
  hasDefault: boolean;
  isForeignKey: boolean;
  relationToModel?: string;
  relationName?: string;
  isEnum: boolean;
}

export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  primaryKey?: string[];
  group?: string;
  color?: 'yellow' | 'red' | 'teal';
}

export interface PrismaEnum {
  name: string;
  values: { name: string }[];
  group?: string;
  color?: 'yellow' | 'red' | 'teal';
}

export interface PrismaSchema {
  models: PrismaModel[];
  enums: PrismaEnum[];
}

export function parsePrismaSchema(content: string): PrismaSchema {
  const lines = content.split('\n');
  const schema: PrismaSchema = {
    models: [],
    enums: [],
  };

  let currentModel: PrismaModel | null = null;
  let currentEnum: PrismaEnum | null = null;
  let inDatasource = false;
  let inGenerator = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Check for datasource block
    if (trimmed.startsWith('datasource')) {
      inDatasource = true;
      continue;
    }

    // Check for generator block
    if (trimmed.startsWith('generator')) {
      inGenerator = true;
      continue;
    }

    // End blocks
    if (trimmed === '}') {
      if (currentModel) {
        schema.models.push(currentModel);
        currentModel = null;
      } else if (currentEnum) {
        schema.enums.push(currentEnum);
        currentEnum = null;
      }
      inDatasource = false;
      inGenerator = false;
      continue;
    }

    // Parse datasource
    if (inDatasource) continue;

    // Skip generator content
    if (inGenerator) continue;

    // Parse model
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*{/);
    if (modelMatch) {
      currentModel = { name: modelMatch[1], fields: [] };
      continue;
    }

    // Parse enum
    const enumMatch = trimmed.match(/^enum\s+(\w+)\s*{/);
    if (enumMatch) {
      currentEnum = { name: enumMatch[1], values: [] };
      continue;
    }

    // Parse enum values
    if (currentEnum) {
      const valueMatch = trimmed.match(/^(\w+)$/);
      if (valueMatch) {
        currentEnum.values.push({ name: valueMatch[1] });
      }
      continue;
    }

    // Parse model fields
    if (currentModel) {
      const field = parseField(trimmed);
      if (field) {
        currentModel.fields.push(field);
      }
    }
  }

  // Build relation graph
  buildRelations(schema);

  // Categorize models into groups
  categorizeModels(schema);

  return schema;
}

function parseField(line: string): PrismaField | null {
  // Remove comments
  const cleanLine = line.split('//')[0].trim();
  if (!cleanLine) return null;

  // Match field definition: name type[modifiers]
  const match = cleanLine.match(/^(\w+)\s+([\w\[\]!?]+)(.*)$/);
  if (!match) return null;

  const [, name, type, rest] = match;
  const baseType = type.replace(/\?/, '').replace(/\[\]/, '');
  const field: PrismaField = {
    name,
    type: baseType,
    isId: false,
    isUnique: false,
    isRequired: !type.includes('?'),
    isList: type.includes('[]'),
    hasDefault: false,
    isForeignKey: false,
    isEnum: false,
  };

  // Parse attributes and modifiers
  const parts = rest.trim().split(/\s+/);
  for (const part of parts) {
    if (!part) continue;

    // Check for relation attribute
    const relationMatch = part.match(/@relation/);
    if (relationMatch) {
      // Extract relation name if present: @relation("Name")
      const nameMatch = part.match(/@relation\("([^"]+)"\)/);
      if (nameMatch) {
        field.relationName = nameMatch[1];
      }

      // Check for fields: @relation(fields: [authorId], references: [id])
      const fieldsMatch = part.match(/fields:\s*\[([\w\s,]+)\]/);
      if (fieldsMatch) {
        // This is the foreign key side of the relation
        field.isForeignKey = true;
      }

      // The type is the related model name
      field.relationToModel = baseType;
      continue;
    }

    // Check for other attributes
    if (part === '@id') field.isId = true;
    if (part === '@unique') field.isUnique = true;
    if (part === '@default') field.hasDefault = true;
    if (part.startsWith('@default(')) field.hasDefault = true;
    if (part === '@updatedAt') field.type = 'DateTime';
  }

  return field;
}

function buildRelations(schema: PrismaSchema) {
  // Build a map of all relations
  const relations = new Map<string, { fromModel: string; fromField: string; toModel: string; toField?: string }[]>();

  for (const model of schema.models) {
    for (const field of model.fields) {
      if (field.relationName) {
        if (!relations.has(field.relationName)) {
          relations.set(field.relationName, []);
        }
        relations.get(field.relationName)!.push({
          fromModel: model.name,
          fromField: field.name,
          toModel: field.relationToModel || field.type,
        });
      }
    }
  }

  // Link relations bidirectionally
  for (const [, relationFields] of relations) {
    if (relationFields.length === 2) {
      const [field1, field2] = relationFields;

      // Set the target model for each side
      const model1 = schema.models.find(m => m.name === field1.fromModel);
      const model2 = schema.models.find(m => m.name === field2.fromModel);

      if (model1 && model2) {
        const field1Obj = model1.fields.find(f => f.name === field1.fromField);
        const field2Obj = model2.fields.find(f => f.name === field2.fromField);

        if (field1Obj) field1Obj.relationToModel = field2.fromModel;
        if (field2Obj) field2Obj.relationToModel = field1.fromModel;
      }
    }
  }
}

function categorizeModels(schema: PrismaSchema) {
  // Define common patterns for grouping
  const groupPatterns: { pattern: RegExp; group: string; color: 'yellow' | 'red' | 'teal' }[] = [
    // Core/auth models (User, Account, Session) - yellow
    { pattern: /^(User|Account|Session|Verification|Auth)/i, group: 'Authentication', color: 'yellow' },
    // Business/content models (Post, Comment, Article, Blog) - red
    { pattern: /^(Post|Comment|Article|Blog|Content|Page|Media)/i, group: 'Content', color: 'red' },
    // Settings/config models (Setting, Config, Preference, System) - teal
    { pattern: /^(Setting|Config|Preference|System|Permission|Role)/i, group: 'Configuration', color: 'teal' },
  ];

  // Group models by name prefix similarity
  const prefixGroups = new Map<string, string[]>();
  for (const model of schema.models) {
    const nameLower = model.name.toLowerCase();
    let grouped = false;

    // Check against predefined patterns
    for (const { pattern, group, color } of groupPatterns) {
      if (pattern.test(model.name)) {
        model.group = group;
        model.color = color;
        grouped = true;
        break;
      }
    }

    // If not matched, try to group by common prefix
    if (!grouped) {
      // Extract prefix (e.g., "Order" from "OrderItem", "Product" from "ProductCategory")
      const prefixes = ['Order', 'Product', 'Customer', 'Invoice', 'Payment', 'Category', 'Tag', 'Subscription'];
      for (const prefix of prefixes) {
        if (nameLower.startsWith(prefix.toLowerCase()) && model.name.length > prefix.length) {
          if (!prefixGroups.has(prefix)) {
            prefixGroups.set(prefix, []);
          }
          prefixGroups.get(prefix)!.push(model.name);
          model.group = prefix;
          model.color = 'red'; // Default business models to red
          grouped = true;
          break;
        }
      }

      // Default group
      if (!grouped) {
        model.group = 'Other';
        model.color = 'yellow';
      }
    }
  }

  // Assign enums to match their related model's color
  for (const enumType of schema.enums) {
    // Find if any model uses this enum
    for (const model of schema.models) {
      const usesEnum = model.fields.some(f => f.type === enumType.name);
      if (usesEnum && model.color) {
        enumType.color = model.color;
        enumType.group = model.group;
        break;
      }
    }
    if (!enumType.color) {
      enumType.color = 'teal';
      enumType.group = 'Configuration';
    }
  }
}

export async function convertPrismaToFlowChart(schema: PrismaSchema): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build a map of enum names
  const enumNames = new Set(schema.enums.map((e) => e.name));

  // Create nodes for models with full field details
  schema.models.forEach((model) => {
    // Calculate node height based on number of fields
    const headerHeight = 50;
    const fieldHeight = 35;
    const height = headerHeight + (model.fields.length * fieldHeight) + 20;

    nodes.push({
      id: model.name,
      type: 'prismaModel',
      position: { x: 0, y: 0 }, // Will be set by ELK
      data: {
        label: model.name,
        type: 'model',
        fields: model.fields,
        color: model.color || 'yellow',
        group: model.group || 'Other',
      },
      style: {
        width: 400,
        height: height,
        minWidth: 400,
      },
      draggable: true,
    });
  });

  // Create nodes for enums
  schema.enums.forEach((enumType) => {
    const valuesHeight = enumType.values.length * 30;
    const height = 50 + valuesHeight + 20;

    nodes.push({
      id: enumType.name,
      type: 'prismaEnum',
      position: { x: 0, y: 0 }, // Will be set by ELK
      data: {
        label: enumType.name,
        type: 'enum',
        values: enumType.values,
        color: enumType.color || 'teal',
        group: enumType.group || 'Configuration',
      },
      style: {
        width: 200,
        height: height,
      },
      draggable: true,
    });
  });

  // Create edges for relations
  schema.models.forEach((model) => {
    model.fields.forEach((field) => {
      // Check if this is a relation field
      if (field.relationToModel && field.relationToModel !== model.name) {
        // Find the target model
        const targetModel = schema.models.find((m) => m.name === field.relationToModel);

        if (targetModel) {
          // Find the corresponding field in the target model
          const targetField = targetModel.fields.find(f =>
            f.relationToModel === model.name ||
            (f.relationName && f.relationName === field.relationName)
          );

          edges.push({
            id: `${model.name}-${field.name}-${targetModel.name}`,
            source: model.name,
            sourceHandle: field.isForeignKey ? `${field.name}-target` : `${field.name}-source`,
            target: targetModel.name,
            targetHandle: targetField ? `${targetField.name}-source` : undefined,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#ffffff', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff', width: 10, height: 10 },
          });
        }
      }
      // Check if this field references an enum
      else if (enumNames.has(field.type)) {
        edges.push({
          id: `${model.name}-${field.name}-${field.type}`,
          source: model.name,
          sourceHandle: `${field.name}-source`,
          target: field.type,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '4,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff', width: 8, height: 8 },
        });
      }
    });
  });

  // Apply ELK layout
  return layoutWithElk(nodes, edges);
}

export function convertPrismaToFlowChartSync(schema: PrismaSchema): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build a map of enum names
  const enumNames = new Set(schema.enums.map((e) => e.name));

  // Create nodes for models with full field details (simple grid layout)
  schema.models.forEach((model, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);

    // Calculate node height based on number of fields
    const headerHeight = 50;
    const fieldHeight = 35;
    const height = headerHeight + (model.fields.length * fieldHeight) + 20;

    nodes.push({
      id: model.name,
      type: 'prismaModel',
      position: { x: col * 400 + 50, y: row * 400 + 50 },
      data: {
        label: model.name,
        type: 'model',
        fields: model.fields,
        color: model.color || 'yellow',
        group: model.group || 'Other',
      },
      style: {
        width: 400,
        height: height,
        minWidth: 400,
      },
      draggable: true,
    });
  });

  // Create nodes for enums
  schema.enums.forEach((enumType, index) => {
    const valuesHeight = enumType.values.length * 30;
    const height = 50 + valuesHeight + 20;

    nodes.push({
      id: enumType.name,
      type: 'prismaEnum',
      position: { x: 1600, y: index * (height + 50) },
      data: {
        label: enumType.name,
        type: 'enum',
        values: enumType.values,
        color: enumType.color || 'teal',
        group: enumType.group || 'Configuration',
      },
      style: {
        width: 200,
        height: height,
      },
      draggable: true,
    });
  });

  // Create edges for relations
  schema.models.forEach((model) => {
    model.fields.forEach((field) => {
      // Check if this is a relation field
      if (field.relationToModel && field.relationToModel !== model.name) {
        // Find the target model
        const targetModel = schema.models.find((m) => m.name === field.relationToModel);

        if (targetModel) {
          // Find the corresponding field in the target model
          const targetField = targetModel.fields.find(f =>
            f.relationToModel === model.name ||
            (f.relationName && f.relationName === field.relationName)
          );

          edges.push({
            id: `${model.name}-${field.name}-${targetModel.name}`,
            source: model.name,
            sourceHandle: field.isForeignKey ? `${field.name}-target` : `${field.name}-source`,
            target: targetModel.name,
            targetHandle: targetField ? `${targetField.name}-source` : undefined,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#ffffff', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff', width: 10, height: 10 },
          });
        }
      }
      // Check if this field references an enum
      else if (enumNames.has(field.type)) {
        edges.push({
          id: `${model.name}-${field.name}-${field.type}`,
          source: model.name,
          sourceHandle: `${field.name}-source`,
          target: field.type,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '4,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff', width: 8, height: 8 },
        });
      }
    });
  });

  return { nodes, edges };
}
