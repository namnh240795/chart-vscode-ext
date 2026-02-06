// Prisma to YAML Transformer
// Converts Prisma schema to our YAML standard

import { PrismaSchema, PrismaModel, PrismaField, PrismaEnum } from './prismaParser';
import * as yaml from 'yaml';

export interface YamlSchema {
  version: string;
  metadata: {
    name: string;
    description?: string;
    version?: string;
  };
  colors: {
    default: string;
    rules?: Array<{
      pattern: string;
      color: string;
      group: string;
    }>;
  };
  models: { [key: string]: YamlModel };
  enums?: { [key: string]: YamlEnum };
}

export interface YamlModel {
  color?: string;
  group?: string;
  tableName?: string;
  schema?: string;
  fields: { [key: string]: YamlField };
  indexes?: YamlIndex[];
  uniqueConstraints?: YamlUniqueConstraint[];
}

export interface YamlField {
  type: string;
  dbType?: string;
  constraints?: {
    notNull?: boolean;
  };
  attributes?: {
    primaryKey?: boolean;
    unique?: boolean;
    default?: string;
    foreignKey?: {
      table: string;
      column: string;
      onDelete?: string;
      onUpdate?: string;
    };
    virtual?: boolean;
    referencedBy?: string;
    list?: boolean;
    map?: string;
    relationName?: string;
  };
}

export interface YamlIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface YamlUniqueConstraint {
  name: string;
  columns: string[];
}

export interface YamlEnum {
  values: Array<{
    name: string;
    description?: string;
  }>;
}

export function prismaToYaml(schema: PrismaSchema, metadata?: { name: string; description?: string }): string {
  const yamlSchema: YamlSchema = {
    version: '1.0',
    metadata: {
      name: metadata?.name || 'Database Schema',
      description: metadata?.description,
      version: '1.0.0',
    },
    colors: {
      default: 'yellow',
    },
    models: {},
  };

  // Add color rules based on model patterns
  const colorPatterns = extractColorPatterns(schema.models);
  if (colorPatterns.length > 0) {
    yamlSchema.colors.rules = colorPatterns;
  }

  // Convert models
  for (const model of schema.models) {
    yamlSchema.models[model.name] = convertModel(model);
  }

  // Convert enums
  if (schema.enums.length > 0) {
    yamlSchema.enums = {};
    for (const enumType of schema.enums) {
      yamlSchema.enums[enumType.name] = convertEnum(enumType);
    }
  }

  return yaml.stringify(yamlSchema);
}

function extractColorPatterns(models: PrismaModel[]): Array<{ pattern: string; color: string; group: string }> {
  const patterns: Array<{ pattern: string; color: string; group: string }> = [];
  const seen = new Set<string>();

  for (const model of models) {
    if (model.group && model.color && !seen.has(model.group)) {
      seen.add(model.group);

      // Create a pattern based on the model name
      const pattern = `^${model.name}`;

      patterns.push({
        pattern,
        color: model.color,
        group: model.group,
      });
    }
  }

  return patterns;
}

function convertModel(model: PrismaModel): YamlModel {
  const yamlModel: YamlModel = {
    fields: {},
  };

  if (model.color) {
    yamlModel.color = model.color;
  }

  if (model.group) {
    yamlModel.group = model.group;
  }

  // Convert fields
  for (const field of model.fields) {
    yamlModel.fields[field.name] = convertField(field, model.name);
  }

  return yamlModel;
}

function convertField(field: PrismaField, modelName: string): YamlField {
  const yamlField: YamlField = {
    type: field.type,
  };

  // Add database type mapping for common Prisma types
  const dbTypeMap: { [key: string]: string } = {
    'String': 'VARCHAR(255)',
    'Int': 'INTEGER',
    'BigInt': 'BIGINT',
    'Decimal': 'DECIMAL(10,2)',
    'Boolean': 'BOOLEAN',
    'DateTime': 'TIMESTAMP',
    'Json': 'JSONB',
    'Bytes': 'BYTEA',
  };

  if (dbTypeMap[field.type]) {
    yamlField.dbType = dbTypeMap[field.type];
  }

  // Add constraints
  const constraints: any = {};
  if (field.isRequired) {
    constraints.notNull = true;
  }
  if (Object.keys(constraints).length > 0) {
    yamlField.constraints = constraints;
  }

  // Add attributes
  const attributes: any = {};

  if (field.isId) {
    attributes.primaryKey = true;
  }

  if (field.isUnique) {
    attributes.unique = true;
  }

  if (field.hasDefault) {
    attributes.default = 'auto()';
  }

  if (field.isForeignKey) {
    attributes.foreignKey = {
      table: field.relationToModel || '',
      column: field.referencesField || 'id',
      onDelete: 'CASCADE',
    };
  }

  if (field.isList) {
    attributes.list = true;
  }

  // Virtual relation field (back-relation)
  if (field.relationToModel && !field.isForeignKey) {
    attributes.virtual = true;
    if (field.relationName) {
      attributes.relationName = field.relationName;
    }
    // Try to find the back-reference field
    if (field.isList) {
      attributes.relationType = 'OneToMany';
    } else {
      attributes.relationType = 'ManyToOne';
    }
  }

  if (Object.keys(attributes).length > 0) {
    yamlField.attributes = attributes;
  }

  return yamlField;
}

function convertEnum(enumType: PrismaEnum): YamlEnum {
  return {
    values: enumType.values.map(v => ({
      name: v.name,
    })),
  };
}
