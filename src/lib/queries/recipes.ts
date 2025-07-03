import { createQuery, useQueryClient } from '@tanstack/svelte-query';

export function createSuggestionsQuery(prompt: string) {
  console.log('createSuggestionsQuery', prompt);
  
	return createQuery({
		queryKey: ['suggestions', prompt],
		queryFn: async () => {
			const response = await fetch(`/api/recipes`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ action: 'suggestions', input: prompt })
			});

			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

			return response.json();
		},
		enabled: !!prompt && prompt.length > 0,
		staleTime: Infinity
	});
}

// export const useSuggestionsQuery = () => {
//   return useQueryClient({
//     query
//   })
// }
