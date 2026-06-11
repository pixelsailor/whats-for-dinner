export function getMealContext():
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert' {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 13) return 'lunch';
  if (hour < 16) return 'snack';
  if (hour < 20) return 'dinner';
  return 'dessert';
}
