// YAML to Schema Parser
// Parses YAML schema files and converts to our internal format

import { PrismaSchema, PrismaModel, PrismaField, PrismaEnum } from './prismaParser';
import * as yaml from 'yaml';

export interface YamlSchema {
  version?: string;
  diagram_type?: 'erd' | 'sequence' | 'flow';
  metadata: {
    name: string;
    description?: string;
    schema_version?: string;
  };
  colors?: {
    default: string;
    rules?: Array<{
      pattern: string;
      color: string;
      group: string;
    }>;
  };
  models?: { [key: string]: YamlModel };
  enums?: { [key: string]: YamlEnum };
}

export interface YamlModel {
  color?: string;
  group?: string;
  table_name?: string;
  schema_name?: string;
  fields: { [key: string]: YamlField };
  indexes?: YamlIndex[];
  unique_constraints?: YamlUniqueConstraint[];
}

export interface YamlField {
  field_type: string;
  db_type?: string;
  constraints?: {
    not_null?: boolean;
  };
  attributes?: {
    primary_key?: boolean;
    unique?: boolean;
    default_value?: string;
    foreign_key?: {
      table: string;
      column: string;
      on_delete?: string;
      on_update?: string;
    };
    virtual?: boolean;
    referenced_by?: string;
    is_list?: boolean;
    map?: string;
    relation_name?: string;
  };
}

export interface YamlIndex {
  index_name: string;
  columns: string[];
  unique?: boolean;
}

export interface YamlUniqueConstraint {
  constraint_name: string;
  columns: string[];
}

export interface YamlEnum {
  values: Array<{
    value_name: string;
    description?: string;
  }>;
}

export function parseYamlSchema(content: string): PrismaSchema {
  try {
    console.log('Parsing YAML schema...');
    console.log('YAML content length:', content.length);

    const parsedYaml = yaml.parse(content) as YamlSchema;
    console.log('Parsed YAML:', JSON.stringify(parsedYaml, null, 2));

    // Detect diagram type - default to 'erd' for backward compatibility
    const diagramType = parsedYaml.diagram_type || 'erd';
    console.log('Diagram type:', diagramType);

    // Currently only ERD is supported for PrismaSchema return type
    if (diagramType !== 'erd') {
      throw new Error(`Diagram type '${diagramType}' should use parseYamlDiagram() instead. parseYamlSchema() only supports ERD diagrams.`);
    }

    const schema: PrismaSchema = {
      models: [],
      enums: [],
    };

    // Convert models
    if (parsedYaml && typeof parsedYaml === 'object' && parsedYaml.models) {
      console.log('Found models in YAML');
      const modelEntries = Object.entries(parsedYaml.models);
      console.log('Model entries:', modelEntries.length);

      for (const [modelName, yamlModel] of modelEntries) {
        console.log('Converting model:', modelName, yamlModel);
        try {
          const model = convertYamlModel(modelName, yamlModel as YamlModel, parsedYaml.colors);
          schema.models.push(model);
        } catch (err) {
          console.error('Error converting model', modelName, err);
        }
      }
    } else {
      console.log('No models found in YAML or invalid format', parsedYaml);
    }

    // Apply color rules
    if (parsedYaml.colors?.rules) {
      applyColorRules(schema.models, parsedYaml.colors.rules);
    }

    // Convert enums
    if (parsedYaml && typeof parsedYaml === 'object' && parsedYaml.enums) {
      const enumEntries = Object.entries(parsedYaml.enums);
      console.log('Found enums in YAML:', enumEntries.length);

      for (const [enumName, yamlEnum] of enumEntries) {
        try {
          schema.enums.push(convertYamlEnum(enumName, yamlEnum as YamlEnum));
        } catch (err) {
          console.error('Error converting enum', enumName, err);
        }
      }
    }

    console.log('Final schema:', schema);
    console.log('Models count:', schema.models.length);
    console.log('Enums count:', schema.enums.length);

    return schema;
  } catch (error) {
    console.error('Failed to parse YAML:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw new Error(`Invalid YAML schema: ${error}`);
  }
}

function convertYamlModel(name: string, yamlModel: YamlModel, colors: any): PrismaModel {
  console.log('convertYamlModel start:', name, 'yamlModel:', yamlModel);

  const model: PrismaModel = {
    name,
    fields: [],
    color: (yamlModel.color as any) || colors?.default || 'yellow',
    group: yamlModel.group,
  };

  // Convert fields
  if (yamlModel.fields) {
    console.log('  Found fields in model:', Object.keys(yamlModel.fields));
    try {
      const fieldEntries = Object.entries(yamlModel.fields);
      console.log('  Field entries count:', fieldEntries.length);

      for (const [fieldName, yamlField] of fieldEntries) {
        console.log('  Converting field:', fieldName, yamlField);
        try {
          const field = convertYamlField(fieldName, yamlField);
          model.fields.push(field);
          console.log('  Field converted successfully');
        } catch (err) {
          console.error('  Error converting field', fieldName, err);
        }
      }
      console.log('  All fields converted, count:', model.fields.length);
    } catch (err) {
      console.error('  Error iterating fields:', err);
    }
  } else {
    console.log('  No fields found in model');
  }

  console.log('convertYamlModel end:', name, 'fields count:', model.fields.length);
  return model;
}

function convertYamlField(name: string, yamlField: YamlField): PrismaField {
  console.log('    convertYamlField:', name, 'yamlField:', JSON.stringify(yamlField));

  const field: PrismaField = {
    name,
    type: yamlField.field_type,
    isId: yamlField.attributes?.primary_key || false,
    isUnique: yamlField.attributes?.unique || false,
    isRequired: yamlField.constraints?.not_null || false,
    isList: yamlField.attributes?.is_list || false,
    hasDefault: !!yamlField.attributes?.default_value,
    isForeignKey: !!yamlField.attributes?.foreign_key,
    isEnum: false, // Will be determined by the schema
  };

  // Handle foreign key
  if (yamlField.attributes?.foreign_key) {
    field.relationToModel = yamlField.attributes.foreign_key.table;
    field.referencesField = yamlField.attributes.foreign_key.column;
  }

  // Handle virtual relation
  if (yamlField.attributes?.virtual) {
    field.relationToModel = yamlField.field_type;
    if (yamlField.attributes.relation_name) {
      field.relationName = yamlField.attributes.relation_name;
    }
  }

  console.log('    Field converted:', field);
  return field;
}

function convertYamlEnum(name: string, yamlEnum: YamlEnum): PrismaEnum {
  return {
    name,
    values: yamlEnum.values?.map(v => ({ name: v.value_name })) || [],
  };
}

function applyColorRules(models: PrismaModel[], rules: Array<{ pattern: string; color: string; group: string }>) {
  for (const model of models) {
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(model.name)) {
          model.color = rule.color as any;
          model.group = rule.group;
          break;
        }
      } catch (e) {
        console.error(`Invalid regex pattern: ${rule.pattern}`, e);
      }
    }
  }
}

/**
 * Parse any diagram type from YAML
 * Returns the raw parsed YAML structure
 */
export function parseYamlDiagram(content: string): any {
  try {
    console.log('Parsing YAML diagram...');
    const parsedYaml = yaml.parse(content);
    console.log('Diagram type:', parsedYaml?.diagram_type || 'erd (default)');
    return parsedYaml;
  } catch (error) {
    console.error('Failed to parse YAML diagram:', error);
    throw new Error(`Invalid YAML diagram: ${error}`);
  }
}
