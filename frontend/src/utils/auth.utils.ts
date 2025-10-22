export const authUtils = {
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string): void {
    localStorage.setItem('token', token);
  },

  clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};