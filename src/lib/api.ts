type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
}

type ApiErrorResponse = {
  success: false;
  error: string | { message: string; code: string; };
  message?: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a `fetch` request using POST and returns the response as a Promise.
 * Not responsible for any error handling
 * 
 * @param action - The openai request that will be made
 * @param input - The value that will be sent with the request
 * @returns {Promise}
 */
export async function recipesApiPostHandler<T>(
  action: 'suggestions' | 'detail',
  input: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, input })
  });

  return response.json();
}