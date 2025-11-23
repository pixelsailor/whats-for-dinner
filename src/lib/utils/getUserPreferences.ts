import { db } from '$lib/db';

/**
 * Queries the local dexie database for the User's personal cooking preferences and returns them
 * in as an LLM friendly string for direct prompt inclusion.
 */
async function getUserPreferences(): Promise<string> {
	const user = await db.preferences.get('preferences');

	const restrictions = [];

	if (user?.diet?.length) {
		restrictions.push(`User follows a ${user.diet.join(', ')} diet.`);
	}
	if (user?.allergies?.length) {
		restrictions.push(`Avoid these allergens: ${user.allergies.join(', ')}.`);
	}
	if (user?.dislikes?.length) {
		restrictions.push(`Do not include ingredients like ${user.dislikes}.`);
	}
	if (user?.equipment?.length) {
		restrictions.push(`Avoid the use of these tools: ${user.equipment.join(', ')}.`);
	}
	if (user?.preferredPrepTime) {
		restrictions.push(`Target recipes that take ${user.preferredPrepTime}.`);
	}
	if (user?.skillLevel) {
		restrictions.push(`User is a(n) ${user.skillLevel} cook — adjust complexity accordingly.`);
	}

	return restrictions.join(' ');
}

export default getUserPreferences;
