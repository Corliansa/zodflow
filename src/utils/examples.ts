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
  products: z.array(ProductSchema),
});

export const MasterSchema = z.object({
  user: UserSchema,
  product: ProductSchema,
});
