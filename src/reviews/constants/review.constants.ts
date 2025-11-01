export const ALLOWED_REVIEW_RATINGS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0] as const;

export function isAllowedReviewRating(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const rounded = Math.round(value * 2) / 2;
  if (rounded !== value) {
    return false;
  }

  return value >= 0.5 && value <= 5 && ALLOWED_REVIEW_RATINGS.includes(Number(value.toFixed(1)) as (typeof ALLOWED_REVIEW_RATINGS)[number]);
}
