import { z } from "zod";

export const musicSourceSchema = z.enum(["netease", "qq", "migu", "bilibili", "other"]);

export const searchQuerySchema = z.object({
  keyword: z.string().trim().min(1),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(30),
  sources: z
    .string()
    .optional()
    .transform((value: string | undefined) => value?.split(",").filter(Boolean) ?? ["migu", "netease", "qq"])
    .pipe(z.array(musicSourceSchema)),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  detail: z.unknown().optional(),
});

export type MusicSourceDto = z.infer<typeof musicSourceSchema>;
export type SearchQueryDto = z.infer<typeof searchQuerySchema>;
export type ApiErrorDto = z.infer<typeof apiErrorSchema>;
