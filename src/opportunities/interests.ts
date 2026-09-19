import { z } from "zod";
export const careerFields = [
  { id: "software", title: "Software Engineering" },
  { id: "ml", title: "Data Science, AI & ML" },
  { id: "product", title: "Product Management" },
  { id: "quant", title: "Quantitative Finance" },
  { id: "hardware", title: "Hardware Engineering" },
] as const;
export const InterestSchema = z.enum([
  "software",
  "ml",
  "product",
  "quant",
  "hardware",
]);
export const InterestUpdateSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    fields: z
      .array(InterestSchema)
      .min(1)
      .max(5)
      .refine((v) => new Set(v).size === v.length, "Choose each field once."),
  })
  .strict();
export type Interests = {
  version: number;
  fields: z.infer<typeof InterestSchema>[];
};
