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
  str: string | z.ZodFirstPartyTypeKind
) => {
  return (Object.values(z.ZodFirstPartyTypeKind) as string[]).includes(str);
};

const generateSpecs = <T extends Dictionary, U extends z.ZodSchema>(
  dict: T,
  schema: U
) => {
  const nodes: Node[] = [];
  const edges: (Edge & {
    targetType?: z.ZodFirstPartyTypeKind;
    targetSchema?: z.ZodSchema;
  })[] = [];

  const { baseSchema } = getBaseSchema(schema);
  const source =
    getName(dict, baseSchema) ?? idGenerator.generateId(getType(baseSchema));

  if (baseSchema instanceof z.ZodEnum) {
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodEnumNode",
      data: {
        label: source,
        items: baseSchema._def.values,
      },
    });
  } else if (baseSchema instanceof z.ZodNativeEnum) {
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodEnumNode",
      data: {
        label: source,
        items: baseSchema._def.values,
      },
    });
  } else if (baseSchema instanceof z.ZodObject) {
    const currentObjectSchema = Object.fromEntries(
      Object.entries(baseSchema.shape).map(([sourceHandle, value]) => {
        const { baseSchema: targetSchema } = getBaseSchema(value as z.ZodAny);
        const target = getName(dict, targetSchema);
        const targetType = getType(targetSchema);
        if (target) {
          if (!edges.find((edge) => edge.targetSchema === targetSchema)) {
            edges.push({
              id: `${source}-${target}`,
              source,
              sourceHandle,
              target,
              targetType,
              targetSchema,
              animated: true,
            });
          }
          return [sourceHandle, target];
        }
        return [sourceHandle, target ?? targetType];
      })
    );
    nodes.push({
      id: source,
      position: { x: 0, y: 0 },
      type: "zodObjectNode",
      data: {
        label: source,
        schema: currentObjectSchema,
      },
    });
  }

  return {
    edges,
    nodes,
  };
};

const idGenerator = new IdGenerator();
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
