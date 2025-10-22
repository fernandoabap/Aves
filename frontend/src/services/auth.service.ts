import { User, LoginCredentials, LoginResponse, RegisterCredentials } from '@/types/user';
import { authUtils } from '@/utils/auth.utils';
import { supabase } from './supabase';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;

    if (!data.user || !data.session) {
      throw new Error('Login failed');
    }

    const response: LoginResponse = {
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata.name || '',
      }
    };

    return response;
  },

  async register(credentials: RegisterCredentials): Promise<LoginResponse> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Este email já está registrado. Por favor, faça login.');
      }
      throw error;
    }

    if (!data.user) {
      throw new Error('Erro ao criar usuário');
    }

    // Se a confirmação de email estiver habilitada no Supabase
    if (!data.session) {
      throw new Error('Por favor, verifique seu email para confirmar o registro');
    }

    const response: LoginResponse = {
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata.name || '',
      }
    };

    return response;
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    authUtils.clearAuthData();
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getToken(): string | null {
    return authUtils.getToken();
  },

  setToken(token: string): void {
    authUtils.setToken(token);
  },

  getUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
};