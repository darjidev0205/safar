import { SafarApiClient } from '@safar/api-client';
import { auth } from './firebase';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = new SafarApiClient({
  baseUrl,
  getAuthToken: async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('safar_auth_token');
        if (stored) return stored;
      }
      return null;
    } catch (err) {
      console.warn('Could not get token from Firebase:', err);
      return null;
    }
  },
});
