import { z } from 'zod';

export const nameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const createPlaySchema = z
  .object({
    gameId: z.number().int().positive(),
    playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'playedOn must be YYYY-MM-DD'),
    notes: z.string().trim().max(2000).nullish(),
    scores: z
      .array(
        z.object({
          playerId: z.number().int().positive(),
          score: z.number().int(),
          isWinner: z.boolean().default(false),
        }),
      )
      .min(1, 'At least one player score is required'),
  })
  .superRefine((data, ctx) => {
    const ids = data.scores.map((s) => s.playerId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each player can only appear once in a play',
      });
    }
  });

export type CreatePlayBody = z.infer<typeof createPlaySchema>;
