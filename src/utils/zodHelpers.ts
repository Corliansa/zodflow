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

const generateSpecs = <T extends Dictionary, U extends z.ZodSchema>(
  dict: T,
  schema: U
) => {
  const specs: {
    parent: string;
    key: string;
    name: string;
    type: z.ZodFirstPartyTypeKind;
    schema: z.ZodSchema;
  }[] = [];
  const { baseSchema } = getBaseSchema(schema);
  const parent =
    findKey(dict, baseSchema) ?? idGenerator.generateId(getType(baseSchema));
  if (baseSchema instanceof z.ZodObject) {
    const currentObjectSchema = Object.fromEntries(
      Object.entries(baseSchema.shape).map(([key, value]) => {
        const { baseSchema: schema } = getBaseSchema(value as z.ZodAny);
        const name = findKey(dict, schema);
        const type = getType(schema);
        if (!specs.find((spec) => spec.schema === schema)) {
          if (name) {
            specs.push({ parent, key, name, type, schema });
          } else {
            specs.push({
              parent,
              key,
              name: idGenerator.generateId(type),
              type,
              schema,
            });
          }
        }
        return [key, name ?? type];
      })
    );
    return {
      specs,
      node: {
        id: parent,
        position: { x: 0, y: 0 },
        type: "zodObjectNode",
        data: {
          parent,
          schema: currentObjectSchema,
        },
      },
    };
  } else if (baseSchema instanceof z.ZodEnum) {
    return {
      specs,
      node: {
        id: parent,
        position: { x: 0, y: 0 },
        type: "zodEnumNode",
        data: {
          parent,
          items: baseSchema._def.values,
        },
      },
    };
  }

  return {
    specs,
    node: undefined,
  };
};

const idGenerator = new IdGenerator();
export const getInitialData = <T extends Dictionary>(dict: T) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const specs: {
    parent: string;
    key: string;
    name: string;
    type: z.ZodFirstPartyTypeKind;
    schema: z.ZodSchema;
  }[] = [];
  for (const schema of Object.values(dict)) {
    const { node, specs: currentSpecs } = generateSpecs(dict, schema);
    if (node) {
      nodes.push(node);
    }
    specs.push(...currentSpecs);
  }

  console.log(specs);

  for (const { parent, key, name, schema } of specs) {
    edges.push({
      id: `${parent}-${name}`,
      source: parent,
      target: name,
      sourceHandle: key,
      animated: true,
    });
  }

  console.log(nodes, edges);

  return {
    nodes,
    edges,
  };
};
