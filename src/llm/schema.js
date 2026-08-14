const { z } = require("zod");

const EnrichInputSchema = z.object({
  title: z.string().min(1),
  price_gbp: z.number(),
  description: z.string().nullable(),
});

const EnrichOutputSchema = z.object({
  category: z.enum(["fiction", "nonfiction", "childrens", "other"]),
  summary: z.string().max(200),
  quality_flags: z.array(
    z.enum(["missing_description", "suspicious_price", "title_too_short"]),
  ),
});

module.exports = { EnrichInputSchema, EnrichOutputSchema };
