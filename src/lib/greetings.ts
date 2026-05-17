export function getGreeting(): string {
  const now = new Date();
  const hour = now.getHours();

  const leadIns = [
    // "What's for",
    'Care to cook up',
    'Thinking about',
    'In the mood for',
    'Hungry for',
    'How about',
    'Time for'
  ];

  const wildcards = [
    "What's cookin', good lookin'?",
    'Time to raid the fridge?',
    'Feeling fancy or keeping it simple?',
    "Chef's choice today?",
    'One bite at a time!'
  ];

  let meals: string[];

  if (hour >= 5 && hour < 10) {
    meals = ['breakfast', 'a hearty breakfast', 'something warm and light'];
  } else if (hour >= 10 && hour < 12) {
    meals = ['brunch', 'a light brunch', 'something in between'];
  } else if (hour >= 12 && hour < 14) {
    meals = ['lunch', 'a quick bite', 'a power lunch'];
  } else if (hour >= 14 && hour < 16) {
    meals = ['late lunch', 'a quick bite', 'a pick-me-up', 'appetizers'];
  } else if (hour >= 16 && hour < 21) {
    meals = ['dinner', 'supper', 'something filling', 'brinner'];
  } else {
    meals = ['a midnight snack', 'something indulgent', 'late night cravings'];
  }

  const useWildcard = Math.random() < 0.15;
  if (useWildcard) {
    return wildcards[Math.floor(Math.random() * wildcards.length)];
  }

  const lead = leadIns[Math.floor(Math.random() * leadIns.length)];
  const meal = meals[Math.floor(Math.random() * meals.length)];

  return `${lead} ${meal}?`;
}
