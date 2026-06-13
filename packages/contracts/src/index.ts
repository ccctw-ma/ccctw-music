import { z } from "zod";

export const musicSourceSchema = z.enum(["netease", "qq", "migu", "itunes", "deezer", "bilibili"]);

export const searchQuerySchema = z.object({
  keyword: z.string().trim().min(1),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(30),
  sources: z
    .string()
    .optional()
    .transform(
      (value: string | undefined) =>
        value?.split(",").filter(Boolean) ?? ["migu", "netease", "qq", "itunes", "deezer", "bilibili"],
    )
    .pipe(z.array(musicSourceSchema)),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  detail: z.unknown().optional(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

export const playableUrlSchema = z.object({
  source: musicSourceSchema,
  url: z.string().nullable(),
  quality: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type MusicSourceDto = z.infer<typeof musicSourceSchema>;
export type SearchQueryDto = z.infer<typeof searchQuerySchema>;
export type ApiErrorDto = z.infer<typeof apiErrorSchema>;
export type PlayableUrlDto = z.infer<typeof playableUrlSchema>;
