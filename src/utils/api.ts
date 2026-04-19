// Legacy API - no longer used, returns empty data
// Supabase client is used directly in stores
export const apiClient = async (endpoint: string, options: RequestInit = {}): Promise<any[]> => {
  console.warn(`API endpoint ${endpoint} is deprecated`);
  return Promise.resolve([]);
};