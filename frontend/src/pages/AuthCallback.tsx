import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bird } from "lucide-react";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg.ts";
import { supabase } from '@/services/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          toast.success("Email verificado com sucesso!");
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } catch (error: any) {
        console.error('Erro ao processar autenticação:', error);
        toast.error(error.message || "Erro ao processar autenticação");
        navigate("/login");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80"></div>
      </div>

      <Card className="relative w-full max-w-md mx-4 shadow-large animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-gradient-nature p-3">
              <Bird className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">BirdWatch</CardTitle>
          <CardDescription className="text-base">
            Verificando autenticação...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;