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

export const isZodFirstPartyTypeKind = (
  type: string | z.ZodFirstPartyTypeKind
) => {
  return (Object.values(z.ZodFirstPartyTypeKind) as string[]).includes(type);
};

export const hasHandle = (type: string | z.ZodFirstPartyTypeKind) => {
  if (!isZodFirstPartyTypeKind(type)) {
    return true;
  }

  if (["ZodEnum", "ZodObject"].includes(type)) {
    return true;
  }

  return false;
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
