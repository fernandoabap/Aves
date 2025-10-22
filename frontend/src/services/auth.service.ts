import { User, LoginCredentials, LoginResponse, RegisterCredentials } from '@/types/user';
import { authUtils } from '@/utils/auth.utils';
import { supabase } from './supabase';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Validação prévia para feedback mais rápido
    if (!credentials.email || !credentials.password) {
      throw new Error('Email e senha são obrigatórios');
    }

    try {
      // Verifica se há uma sessão em cache
      const cachedSession = localStorage.getItem('birdwatch_auth');
      if (cachedSession) {
        try {
          const session = JSON.parse(cachedSession);
          if (session.user?.email === credentials.email && session.expires_at > Date.now()) {
            return {
              token: session.access_token,
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata.name || '',
              }
            };
          }
        } catch (e) {
          // Se houver erro ao ler o cache, ignora e continua com o login normal
          console.warn('Erro ao ler sessão do cache:', e);
        }
      }

      // Se não houver sessão válida, faz o login
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
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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