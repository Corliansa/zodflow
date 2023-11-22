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

const findKey = <T extends Dictionary>(obj: T, value: z.ZodSchema) => {
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
  str: string | z.ZodFirstPartyTypeKind
) => {
  return (Object.values(z.ZodFirstPartyTypeKind) as string[]).includes(str);
};

export const getInitialData = <T extends z.ZodSchema, U extends Dictionary>(
  schema: T,
  dict: U
) => {
  const { baseSchema } = getBaseSchema(schema);

  if (!(baseSchema instanceof z.ZodObject)) {
    throw new Error("Root schema must be an object");
  }

  const nodeTypes: {
    key: string;
    name: string;
    type: z.ZodFirstPartyTypeKind;
    schema: z.ZodSchema;
  }[] = [];
  const rootObjectSchema = Object.fromEntries(
    Object.entries(baseSchema.shape).map(([key, value]) => {
      const { baseSchema: schema } = getBaseSchema(value as z.ZodAny);
      const name = findKey(dict, schema);
      const type = getType(schema);
      name && nodeTypes.push({ key, name, type, schema });
      return [key, name ?? type];
    })
  );

  const label = findKey(dict, baseSchema) ?? "Root";
  const rootNode = {
    id: label,
    position: { x: 0, y: 0 },
    type: "zodObjectNode",
    data: {
      label,
      schema: rootObjectSchema,
    },
  };
  const nodes: Node[] = [rootNode];
  const edges: Edge[] = [];
  for (const { key, name, schema } of nodeTypes) {
    if (schema instanceof z.ZodObject) {
      const data = getInitialData(schema, dict);
      nodes.push(...data.nodes);
      edges.push(...data.edges);
    }
    if (schema instanceof z.ZodEnum) {
      nodes.push({
        id: name,
        position: { x: 0, y: 0 },
        type: "zodEnumNode",
        data: {
          label: name,
          items: schema._def.values,
        },
      });
    }
    edges.push({
      id: `${label}-${name}`,
      source: label,
      target: name,
      sourceHandle: key,
      animated: true,
    });
  }

  return {
    nodes,
    edges,
  };
};
