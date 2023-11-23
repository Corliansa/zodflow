import { z } from "zod";

export const ProductSchema = z.object({
  productType: z.enum(["book", "movie"]),
  productId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  obj: z.object({
    test: z.string(),
  }),
});

export const UserRole = z.enum(["admin", "user"]);

export const UserSchema = z.object({
  role: UserRole,
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  products: z.array(ProductSchema),
  new: z.literal(true),
});

export const MasterSchema = z.object({
  user: UserSchema,
  product: ProductSchema,
});
