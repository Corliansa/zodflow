import { z } from "zod";

export const ProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
});

export const UserRole = z.enum(["admin", "user"]);

export const UserSchema = z.object({
  role: UserRole,
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const TestSchema = z.object({
  enum: z.enum(["A", "B", "C", "D"]),
  enumInArray: z.array(z.enum(["A", "B", "C", "D"])),
  array: z.array(z.string()),
  arrayInArray: z.array(z.array(z.string())),
  tuple: z.tuple([z.string(), z.number()]),
  union: z.union([z.string(), z.number()]),
  record: z.record(z.string()),
  numberRecord: z.record(z.number(), z.string()),
  object: z.object({
    object: z.object({
      object: z.string(),
    }),
  }),
  arrayInUnion: z.union([z.number().array(), z.array(z.string())]),
  map: z.map(z.string(), z.number()),
  set: z.set(z.string()),
  literal: z.literal("literal"),
  literalTrue: z.literal(true),
  literalNumber: z.literal(1),
});
