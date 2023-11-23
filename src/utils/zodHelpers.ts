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

  if (type.match(/^ZodArray<(\w+)>/)) {
    return `${renderType(type.match(/^ZodArray<(\w+)>/)![1])}[]`;
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

  if (type.match(/^ZodRecord<(\w+, \w+)>/)) {
    const [keyType, valueType] = type
      .match(/ZodRecord<(\w+, \w+)>/)![1]
      .split(", ");
    return `{ [key: ${renderType(keyType)}]: ${renderType(valueType)} }`;
  }

  if (type.match(/^ZodMap<(\w+, \w+)>/)) {
    const [keyType, valueType] = type
      .match(/ZodMap<(\w+, \w+)>/)![1]
      .split(", ");
    return `Map<${renderType(keyType)}, ${renderType(valueType)}>`;
  }

  if (type.match(/^ZodSet<(\w+)>/)) {
    return `Set<${renderType(type.match(/^ZodSet<(\w+)>/)![1])}>`;
  }

  if (type.match(/^ZodLiteral<(.+)>/)) {
    return `Literal<${type.match(/^ZodLiteral<(.+)>/)![1]}>`;
  }

  return type;
};

const getName = <T extends Dictionary>(obj: T, value: z.ZodSchema) => {
  return Object.keys(obj).find((key) => obj[key] === value);
};

export const getType = (schema: z.ZodSchema): z.ZodFirstPartyTypeKind => {
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

const idGenerator = new IdGenerator();
const generateSpecs = <T extends Dictionary, U extends z.ZodSchema>(
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
    getName(dict, baseSchema) ??
    config?.id ??
    idGenerator.generateId(getType(baseSchema));
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
      Object.entries(baseSchema.shape).map(([sourceHandle, value]) => {
        const { baseSchema: targetSchema } = getBaseSchema(
          value as z.ZodSchema
        );
        const target = getName(dict, targetSchema);
        const targetType = getType(targetSchema);
        if (target && !edges.find((edge) => edge.target === target)) {
          edges.push({
            id: `${source}-${target}`,
            source,
            sourceHandle,
            target,
            animated: true,
          });
          return [sourceHandle, target];
        }
        const newTarget = `${source}:${sourceHandle}`;
        if (targetSchema instanceof z.ZodEnum) {
          nodes.push({
            id: newTarget,
            position: { x: 0, y: 0 },
            type: "zodEnumNode",
            data: {
              label: sourceHandle,
              items: targetSchema._def.values,
            },
          });
          edges.push({
            id: `${source}-${newTarget}`,
            source,
            sourceHandle,
            target: newTarget,
            animated: true,
          });
        } else if (targetSchema instanceof z.ZodNativeEnum) {
          nodes.push({
            id: newTarget,
            position: { x: 0, y: 0 },
            type: "zodEnumNode",
            data: {
              label: sourceHandle,
              items: targetSchema._def.values,
            },
          });
          edges.push({
            id: `${source}-${newTarget}`,
            source,
            sourceHandle,
            target: newTarget,
            animated: true,
          });
        } else if (targetSchema instanceof z.ZodObject) {
          const specs = generateSpecs(dict, targetSchema, {
            id: newTarget,
            label: sourceHandle,
          });
          nodes.push(...specs.nodes);
          edges.push({
            id: `${source}-${newTarget}`,
            source,
            sourceHandle,
            target: newTarget,
            animated: true,
          });
          edges.push(...specs.edges);
        } else if (targetSchema instanceof z.ZodLiteral) {
          const literalValue = targetSchema._def.value;
          return [sourceHandle, `ZodLiteral<${JSON.stringify(literalValue)}>`];
        } else if (targetSchema instanceof z.ZodArray) {
          const { baseSchema: elementBaseSchema } = getBaseSchema(
            targetSchema._def.type
          );
          const element = getName(dict, elementBaseSchema);
          const elementType = getType(elementBaseSchema);
          if (element && !edges.find((edge) => edge.target === element)) {
            edges.push({
              id: `${source}-${element}`,
              source,
              sourceHandle,
              target: element,
              animated: true,
            });
            return [sourceHandle, `ZodArray<${element}>`];
          }
          return [sourceHandle, `ZodArray<${elementType}>`];
        } else if (targetSchema instanceof z.ZodTuple) {
          const elements = (targetSchema._def.items as z.ZodSchema[]).map(
            (item) => {
              const { baseSchema: elementBaseSchema } = getBaseSchema(item);
              const element = getName(dict, elementBaseSchema);
              const elementType = getType(elementBaseSchema);
              if (element && !edges.find((edge) => edge.target === element)) {
                edges.push({
                  id: `${source}-${element}`,
                  source,
                  sourceHandle,
                  target: element,
                  animated: true,
                });
                return element;
              }
              return elementType;
            }
          );
          return [sourceHandle, `ZodTuple<[${elements.join(", ")}]>`];
        } else if (targetSchema instanceof z.ZodUnion) {
          const elements = (targetSchema._def.options as z.ZodSchema[]).map(
            (item) => {
              const { baseSchema: elementBaseSchema } = getBaseSchema(item);
              const element = getName(dict, elementBaseSchema);
              const elementType = getType(elementBaseSchema);
              if (element && !edges.find((edge) => edge.target === element)) {
                edges.push({
                  id: `${source}-${element}`,
                  source,
                  sourceHandle,
                  target: element,
                  animated: true,
                });
                return element;
              }
              return elementType;
            }
          );
          return [sourceHandle, `ZodUnion<[${elements.join(", ")}]>`];
        } else if (targetSchema instanceof z.ZodRecord) {
          const { baseSchema: keyBaseSchema } = getBaseSchema(
            targetSchema._def.keyType
          );
          const keyType = getType(keyBaseSchema);
          const { baseSchema: elementBaseSchema } = getBaseSchema(
            targetSchema._def.valueType
          );
          const element = getName(dict, elementBaseSchema);
          const elementType = getType(elementBaseSchema);
          if (element && !edges.find((edge) => edge.target === element)) {
            edges.push({
              id: `${source}-${element}`,
              source,
              sourceHandle,
              target: element,
              animated: true,
            });
            return [sourceHandle, `ZodRecord<${keyType}, ${element}>`];
          }
          return [sourceHandle, `ZodRecord<${keyType}, ${elementType}>`];
        } else if (targetSchema instanceof z.ZodMap) {
          const { baseSchema: keyBaseSchema } = getBaseSchema(
            targetSchema._def.keyType
          );
          const keyType = getType(keyBaseSchema);
          const { baseSchema: elementBaseSchema } = getBaseSchema(
            targetSchema._def.valueType
          );
          const element = getName(dict, elementBaseSchema);
          const elementType = getType(elementBaseSchema);
          if (element && !edges.find((edge) => edge.target === element)) {
            edges.push({
              id: `${source}-${element}`,
              source,
              sourceHandle,
              target: element,
              animated: true,
            });
            return [sourceHandle, `ZodMap<${keyType}, ${element}>`];
          }
          return [sourceHandle, `ZodMap<${keyType}, ${elementType}>`];
        } else if (targetSchema instanceof z.ZodSet) {
          const { baseSchema: elementBaseSchema } = getBaseSchema(
            targetSchema._def.valueType
          );
          const element = getName(dict, elementBaseSchema);
          const elementType = getType(elementBaseSchema);
          if (element && !edges.find((edge) => edge.target === element)) {
            edges.push({
              id: `${source}-${element}`,
              source,
              sourceHandle,
              target: element,
              animated: true,
            });
            return [sourceHandle, `ZodSet<${element}>`];
          }
          return [sourceHandle, `ZodSet<${elementType}>`];
        }
        return [sourceHandle, targetType];
      })
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
    const specs = generateSpecs(dict, schema);
    nodes.push(...specs.nodes);
    edges.push(...specs.edges);
  }

  console.log(nodes, edges);

  return {
    nodes,
    edges,
  };
};
