import { IdGenerator } from "./generator";
import { Edge, Node } from "reactflow";
import { ZodDefault, ZodEffects, ZodNullable, ZodOptional } from "zod";
import { z } from "zod";

export type UnwrapSchema<
  T extends z.ZodSchema,
  StopAt = never
> = T extends Exclude<
  | ZodEffects<infer U>
  | ZodDefault<infer U>
  | ZodOptional<infer U>
  | ZodNullable<infer U>,
  StopAt
>
  ? UnwrapSchema<U, StopAt>
  : T;

type Dictionary = Record<string, z.ZodSchema>;

export const isZodFirstPartyTypeKind = (
  type: string | z.ZodFirstPartyTypeKind
) => {
  return (Object.values(z.ZodFirstPartyTypeKind) as string[]).includes(type);
};

export const hasHandle = (type: string | z.ZodFirstPartyTypeKind) => {
  if (!isZodFirstPartyTypeKind(type)) {
    return true;
  }

  if (["ZodEnum", "ZodNativeEnum", "ZodObject"].includes(type)) {
    return true;
  }

  return false;
};

export const renderType = (type: string | z.ZodFirstPartyTypeKind): string => {
  if (isZodFirstPartyTypeKind(type)) {
    return type.replace(/^Zod/, "").toLowerCase();
  }

  if (type.match(/^ZodArray<(.+)>/)) {
    return `${renderType(type.match(/^ZodArray<(.+)>/)![1])}[]`;
  }

  if (type.match(/^ZodTuple<\[(.+)\]>/)) {
    return `[${type
      .match(/ZodTuple<\[(.+)\]>/)![1]
      .split(", ")
      .map((t) => renderType(t))
      .join(", ")}]`;
  }

  if (type.match(/^ZodUnion<\[(.+)\]>/)) {
    return type
      .match(/ZodUnion<\[(.+)\]>/)![1]
      .split(", ")
      .map((t) => renderType(t))
      .join(" | ");
  }

  if (type.match(/^ZodRecord<(.+, .+)>/)) {
    const [keyType, valueType] = type
      .match(/ZodRecord<(.+, .+)>/)![1]
      .split(", ");
    return `{ [key: ${renderType(keyType)}]: ${renderType(valueType)} }`;
  }

  if (type.match(/^ZodMap<(.+, .+)>/)) {
    const [keyType, valueType] = type.match(/ZodMap<(.+, .+)>/)![1].split(", ");
    return `Map<${renderType(keyType)}, ${renderType(valueType)}>`;
  }

  if (type.match(/^ZodSet<(.+)>/)) {
    return `Set<${renderType(type.match(/^ZodSet<(.+)>/)![1])}>`;
  }

  if (type.match(/^ZodLiteral<(.+)>/)) {
    return `Literal<${type.match(/^ZodLiteral<(.+)>/)![1]}>`;
  }

  return type;
};

const getSchemaName = <T extends Dictionary>(obj: T, value: z.ZodSchema) => {
  return Object.keys(obj).find((key) => obj[key] === value);
};

export const getZodType = (schema: z.ZodSchema): z.ZodFirstPartyTypeKind => {
  // @ts-expect-error
  return schema._def.typeName;
};

export const getBaseSchema = <T extends z.ZodSchema>(schema: T) => {
  let baseSchema = schema;
  let optional = false;
  let nullable = false;
  let defaultValue: unknown;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (baseSchema instanceof ZodNullable) {
      baseSchema = baseSchema.unwrap();
      nullable = true;
    } else if (baseSchema instanceof ZodOptional) {
      baseSchema = baseSchema.unwrap();
      optional = true;
    } else if (baseSchema instanceof ZodDefault) {
      defaultValue = baseSchema._def.defaultValue();
      baseSchema = baseSchema._def.innerType;
    } else if (baseSchema instanceof ZodEffects) {
      baseSchema = baseSchema.innerType();
    } else {
      break;
    }
  }

  return {
    baseSchema: baseSchema as UnwrapSchema<T>,
    optional,
    nullable,
    defaultValue,
  };
};

const getType = <T extends Dictionary, U extends z.ZodSchema>(
  dict: T,
  schema: U,
  config: {
    source: string;
    sourceHandle: string;
    nodes: Node[];
    edges: Edge[];
  }
): string => {
  const { source, sourceHandle, nodes, edges } = config;

  const addEdge = (target: string) => {
    if (!edges.find((edge) => edge.target === target)) {
      edges.push({
        id: `${source}-${target}`,
        source,
        sourceHandle,
        target,
        animated: true,
      });
    }
  };

  const { baseSchema: targetSchema } = getBaseSchema(schema as z.ZodSchema);
  const target = getSchemaName(dict, targetSchema);
  const targetType = getZodType(targetSchema);
  if (target) {
    addEdge(target);
    return target;
  }

  const newTarget = `${source}:${sourceHandle}`;
  if (
    targetSchema instanceof z.ZodEnum ||
    targetSchema instanceof z.ZodNativeEnum
  ) {
    nodes.push({
      id: newTarget,
      position: { x: 0, y: 0 },
      type: "zodEnumNode",
      data: {
        label: sourceHandle,
        items: targetSchema._def.values,
      },
    });
    addEdge(newTarget);
  } else if (targetSchema instanceof z.ZodObject) {
    const specs = getSchemaData(dict, targetSchema, {
      id: newTarget,
      label: sourceHandle,
    });
    nodes.push(...specs.nodes);
    edges.push(...specs.edges);
    addEdge(newTarget);
  } else if (targetSchema instanceof z.ZodLiteral) {
    const literalValue = targetSchema._def.value;
    return `ZodLiteral<${JSON.stringify(literalValue)}>`;
  } else if (targetSchema instanceof z.ZodTuple) {
    const elements = (targetSchema._def.items as z.ZodSchema[]).map((item) =>
      getType(dict, item, config)
    );
    return `ZodTuple<[${elements.join(", ")}]>`;
  } else if (targetSchema instanceof z.ZodUnion) {
    const elements = (targetSchema._def.options as z.ZodSchema[]).map((item) =>
      getType(dict, item, config)
    );
    return `ZodUnion<[${elements.join(", ")}]>`;
  } else if (targetSchema instanceof z.ZodArray) {
    return `ZodArray<${getType(dict, targetSchema._def.type, config)}>`;
  } else if (targetSchema instanceof z.ZodSet) {
    return `ZodSet<${getType(dict, targetSchema._def.valueType, config)}>`;
  } else if (targetSchema instanceof z.ZodRecord) {
    return `ZodRecord<${getType(
      dict,
      targetSchema._def.keyType,
      config
    )}, ${getType(dict, targetSchema._def.valueType, config)}>`;
  } else if (targetSchema instanceof z.ZodMap) {
    return `ZodMap<${getType(
      dict,
      targetSchema._def.keyType,
      config
    )}, ${getType(dict, targetSchema._def.valueType, config)}>`;
  }
  return targetType;
};

const idGenerator = new IdGenerator();
const getSchemaData = <T extends Dictionary, U extends z.ZodSchema>(
  dict: T,
  schema: U,
  config?: {
    id?: string;
    label?: string;
  }
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const { baseSchema } = getBaseSchema(schema);
  const source =
    getSchemaName(dict, baseSchema) ??
    config?.id ??
    idGenerator.generateId(getZodType(baseSchema));
  const label = config?.label ?? source;

  if (baseSchema instanceof z.ZodEnum) {
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodEnumNode",
      data: {
        label,
        items: baseSchema._def.values,
      },
    });
  } else if (baseSchema instanceof z.ZodNativeEnum) {
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodEnumNode",
      data: {
        label,
        items: baseSchema._def.values,
      },
    });
  } else if (baseSchema instanceof z.ZodObject) {
    const currentObjectSchema = Object.fromEntries(
      Object.entries(baseSchema.shape).map(([key, value]) => [
        key,
        getType(dict, value as z.ZodSchema, {
          source,
          sourceHandle: key,
          nodes,
          edges,
        }),
      ])
    );
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodObjectNode",
      data: {
        label,
        schema: currentObjectSchema,
      },
    });
  }

  return {
    edges,
    nodes,
  };
};

export const getInitialData = <T extends Dictionary>(dict: T) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  for (const schema of Object.values(dict)) {
    const specs = getSchemaData(dict, schema);
    nodes.push(...specs.nodes);
    edges.push(...specs.edges);
  }

  return {
    nodes,
    edges,
  };
};
