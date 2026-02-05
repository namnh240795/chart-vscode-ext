// Type definitions for YAML flow chart format

export interface FlowChartYaml {
  flow: {
    id: string;
    name: string;
    description?: string;
  };
  nodes: NodeYaml[];
  edges: EdgeYaml[];
  styles?: StylesYaml;
}

export interface NodeYaml {
  id: string;
  type: 'input' | 'output' | 'default' | 'group';
  label: string;
  position: {
    x: number;
    y: number;
  };
  data?: {
    color?: string;
    icon?: string;
    description?: string;
    [key: string]: any;
  };
}

export interface EdgeYaml {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  type?: string;
  style?: Record<string, any>;
}

export interface StylesYaml {
  theme?: {
    background?: string;
    grid?: boolean;
    gridColor?: string;
  };
}

// Prisma-like schema YAML types
export interface PrismaSchemaYaml {
  schema: {
    name: string;
    version?: string;
  };
  datasource: {
    provider: string;
    url: string;
  };
  generator: {
    provider: string;
  };
  models: ModelYaml[];
}

export interface ModelYaml {
  name: string;
  documentation?: string;
  isEnum?: boolean;
  fields?: FieldYaml[];
  values?: EnumValueYaml[];
}

export interface FieldYaml {
  name: string;
  type: string;
  isId?: boolean;
  isAutoIncrement?: boolean;
  isUnique?: boolean;
  default?: any;
  documentation?: string;
  relation?: string;
  fields?: string[];
  references?: string[];
  updatedAt?: boolean;
}

export interface EnumValueYaml {
  name: string;
}
