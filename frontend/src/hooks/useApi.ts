import { useState, useCallback } from 'react';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (apiCall: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Error en la petición';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { data, loading, error, request, clearError, setData };
}
