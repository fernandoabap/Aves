import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bird } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import heroBg from "@/assets/hero-bg.jpg.ts";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/auth.context";
import { supabase } from "@/services/supabase";
import { Separator } from "@/components/ui/separator";

const Login = () => {
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    isLoading: false,
    showPassword: false
  });
  const navigate = useNavigate();
  const toast = useToast();
  const { signIn, user, loading: authLoading } = useAuth();

  const { email, password, isLoading, showPassword } = formState;

  const updateFormState = (field: string, value: string | boolean) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    // Se o usuário já estiver autenticado e não estiver carregando, redireciona para o dashboard
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      updateFormState('isLoading', true);

      // Validação prévia com feedback imediato
      if (!email || !password) {
        toast.error("Por favor, preencha todos os campos");
        return;
      }

      if (!email.includes('@')) {
        toast.error("Por favor, insira um email válido");
        return;
      }

      const response = await authService.login({ email, password });
      
      // Atualiza o contexto de autenticação
      signIn(response.token, response.user);
      
      toast.success("Login realizado com sucesso!");

      // Navega para o dashboard
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.message?.includes('Invalid login') 
        ? "Email ou senha incorretos"
        : error.message || "Erro ao fazer login. Tente novamente.";
      
      toast.error(errorMessage);
    } finally {
      updateFormState('isLoading', false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80"></div>
      </div>

      {/* Login card */}
      <Card className="relative w-full max-w-md mx-4 shadow-large animate-fade-in z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-gradient-nature p-3">
              <Bird className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">BirdWatch</CardTitle>
          <CardDescription className="text-base">
            Sistema de Monitoramento de Aves
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => updateFormState('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-muted-foreground hover:text-primary"
                  disabled={isLoading}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => updateFormState('password', e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => updateFormState('showPassword', !showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Button 
              variant="outline" 
              type="button" 
              className="w-full"
              onClick={() => navigate("/register")}
            >
              Criar nova conta
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Ao fazer login, você concorda com nossos{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary">
                Termos de serviço
              </a>{" "}
              e{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary">
                Política de privacidade
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;