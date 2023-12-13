import { IdGenerator } from "./generator";
import { Edge, MarkerType, Node } from "reactflow";
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

export type Dictionary = Record<string, z.ZodSchema>;

export const isZodFirstPartyTypeKind = (
  type: string | z.ZodFirstPartyTypeKind
) => {
  return (Object.values(z.ZodFirstPartyTypeKind) as string[]).includes(type);
};

const r = {
  ZodArray: /^ZodArray<(.+)>$/,
  ZodTuple: /^ZodTuple<\[(.+)\]>$/,
  ZodUnion: /^ZodUnion<\[(.+)\]>$/,
  ZodRecord: /^ZodRecord<(.+, .+)>$/,
  ZodMap: /^ZodMap<(.+, .+)>$/,
  ZodSet: /^ZodSet<(.+)>$/,
  ZodLiteral: /^ZodLiteral<(.+)>$/,
  ZodEnum: /^ZodEnum<\[(.+)\]>$/,
} as const;

export const hasHandle = (type: string, whitelist?: string[]): boolean => {
  if (["ZodObject"].includes(type)) {
    return true;
  }

  if (whitelist?.includes(type)) {
    return true;
  }

  const typeEntry = Object.entries(r).find(([_, regex]) => type.match(regex));
  if (typeEntry) {
    const [innerType, typeRegex] = typeEntry;
    if (["ZodTuple", "ZodUnion", "ZodMap", "ZodEnum"].includes(innerType)) {
      return type
        .match(typeRegex)![1]
        .split(", ")
        .some((t) => hasHandle(t, whitelist));
    }
    if (["ZodRecord"].includes(innerType)) {
      return hasHandle(type.match(typeRegex)![1].split(", ")[1], whitelist);
    }
    return hasHandle(type.match(typeRegex)![1], whitelist);
  }

  return false;
};

export const renderType = (type: string | z.ZodFirstPartyTypeKind): string => {
  if (isZodFirstPartyTypeKind(type)) {
    return type.replace(/^Zod/, "").toLowerCase();
  }

  if (type.match(r.ZodArray)) {
    return `Array<${renderType(type.match(r.ZodArray)![1])}>`;
  }

  if (type.match(r.ZodTuple)) {
    return `[${type
      .match(r.ZodTuple)![1]
      .split(", ")
      .map((t) => renderType(t))
      .join(", ")}]`;
  }

  if (type.match(r.ZodUnion)) {
    return type
      .match(r.ZodUnion)![1]
      .split(", ")
      .map((t) => renderType(t))
      .join(" | ");
  }

  if (type.match(r.ZodRecord)) {
    const [keyType, valueType] = type.match(r.ZodRecord)![1].split(", ");
    return `{ [key: ${renderType(keyType)}]: ${renderType(valueType)} }`;
  }

  if (type.match(r.ZodMap)) {
    const [keyType, valueType] = type.match(r.ZodMap)![1].split(", ");
    return `Map<${renderType(keyType)}, ${renderType(valueType)}>`;
  }

  if (type.match(r.ZodSet)) {
    return `Set<${renderType(type.match(r.ZodSet)![1])}>`;
  }

  if (type.match(r.ZodLiteral)) {
    return type.match(r.ZodLiteral)![1];
  }

  if (type.match(r.ZodEnum)) {
    return type
      .match(r.ZodEnum)![1]
      .split(", ")
      .map((t) => renderType(t))
      .join(" | ");
  }

  return type;
};

const getSchemaName = <T extends Dictionary>(dict: T, value: z.ZodSchema) => {
  return Object.keys(dict).find((key) => dict[key] === value);
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
    const edgeId = `${source}[${sourceHandle}]->${target}`;
    if (!edges.find((edge) => edge.id === edgeId)) {
      edges.push({
        id: edgeId,
        source,
        sourceHandle,
        target,
        markerEnd: {
          type: "arrowclosed" as MarkerType,
        },
        type: "SmartBezierEdge",
      });
    }
  };

  const { baseSchema: targetSchema } = getBaseSchema(schema as z.ZodSchema);
  const target = getSchemaName(dict, schema);
  const targetType = getZodType(targetSchema);
  if (target) {
    addEdge(target);
    return target;
  }

  const newTarget = `${source}::${sourceHandle}`;
  if (
    targetSchema instanceof z.ZodEnum ||
    targetSchema instanceof z.ZodNativeEnum
  ) {
    if (target) {
      nodes.push({
        id: newTarget,
        position: { x: 0, y: 0 },
        type: "ZodEnumNode",
        data: {
          label: sourceHandle,
          items: targetSchema._def.values,
        },
        height: 100 + 30 * targetSchema._def.values.length,
        width:
          Math.max(
            sourceHandle.length * 15,
            ...targetSchema._def.values.map((v: string) => v.length * 15)
          ) + 25,
      });
      addEdge(newTarget);
    } else {
      return `ZodEnum<[${targetSchema._def.values
        .map((value: string) => JSON.stringify(value))
        .join(", ")}]>`;
    }
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
    getSchemaName(dict, schema) ??
    config?.id ??
    idGenerator.generateId(getZodType(baseSchema));
  const label = config?.label ?? source;

  if (
    baseSchema instanceof z.ZodEnum ||
    baseSchema instanceof z.ZodNativeEnum
  ) {
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "ZodEnumNode",
      data: {
        label,
        items: baseSchema._def.values,
      },
      height: 100 + 30 * baseSchema._def.values.length,
      width:
        Math.max(
          label.length * 15,
          ...baseSchema._def.values.map((v: string) => v.length * 15)
        ) + 25,
    });
  } else if (baseSchema instanceof z.ZodObject) {
    const objectEntries = Object.fromEntries(
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
      type: "ZodObjectNode",
      data: {
        label,
        entries: objectEntries,
        schemas: Object.keys(dict),
      },
      height: 100 + 30 * Object.keys(objectEntries).length,
      width:
        Math.max(
          label.length * 15,
          ...Object.entries(objectEntries).map(
            ([k, v]) => (k.length + renderType(v).length) * 15
          )
        ) + 25,
    });
  }

  return {
    edges,
    nodes,
  };
};

const removeDuplicate = <T extends Dictionary>(dict: T) => {
  const seenValues = new Set();

  return Object.fromEntries(
    Object.entries(dict).filter(([_, value]) => {
      if (!seenValues.has(value)) {
        seenValues.add(value);
        return true;
      }
      return false;
    })
  );
};

export const getInitialData = <T extends Dictionary>(dict: T) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const unduplicated = removeDuplicate(dict);
  for (const schema of Object.values(unduplicated)) {
    if (!(schema instanceof z.ZodSchema)) {
      continue;
    }
    const specs = getSchemaData(unduplicated, schema);
    nodes.push(...specs.nodes);
    edges.push(...specs.edges);
  }

  return {
    nodes,
    edges,
  };
};
