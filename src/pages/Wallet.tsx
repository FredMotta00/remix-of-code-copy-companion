import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Building2, Loader2, LogIn } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { WalletCard } from '@/components/wallet/WalletCard';
import { WalletTransactionList } from '@/components/wallet/WalletTransactionList';
import { TierProgress } from '@/components/wallet/TierProgress';

const WalletPage = () => {
  const { 
    user, 
    company, 
    transactions, 
    isLoading, 
    isAuthenticated,
    createCompany,
    isCreatingCompany 
  } = useWallet();

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: ''
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;
    
    await createCompany({
      nome: formData.nome,
      cnpj: formData.cnpj || undefined
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sua carteira...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="gradient-hero text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary-foreground/20 rounded-xl">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">EXS Wallet</h1>
                <p className="text-primary-foreground/80">Programa de Fidelidade</p>
              </div>
            </div>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">
              Acumule cashback em todas as suas locações e use o saldo para obter descontos. 
              Quanto mais você aluga, maior seu nível e maior o cashback!
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Faça login para acessar</h3>
              <p className="text-muted-foreground mb-6">
                Entre na sua conta para visualizar sua carteira EXS Wallet e aproveitar os benefícios do programa de fidelidade.
              </p>
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Fazer Login
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 py-12">
            <Card className="text-center p-6">
              <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Faça Reservas</h3>
              <p className="text-muted-foreground text-sm">
                Alugue equipamentos normalmente. O cashback é calculado automaticamente.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Acumule Cashback</h3>
              <p className="text-muted-foreground text-sm">
                Após a devolução do equipamento, o cashback é liberado na sua carteira.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Use o Saldo</h3>
              <p className="text-muted-foreground text-sm">
                Aplique seu saldo como desconto nas próximas reservas.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but no company registered
  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="gradient-hero text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary-foreground/20 rounded-xl">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">EXS Wallet</h1>
                <p className="text-primary-foreground/80">Programa de Fidelidade</p>
              </div>
            </div>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">
              Cadastre sua empresa para começar a acumular cashback em todas as suas locações!
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Cadastrar Empresa
              </CardTitle>
              <CardDescription>
                Preencha os dados da sua empresa para ativar a EXS Wallet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Razão Social ou Nome Fantasia"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <p>📧 Email vinculado: <strong className="text-foreground">{user?.email}</strong></p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  disabled={isCreatingCompany || !formData.nome.trim()}
                >
                  {isCreatingCompany ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      Ativar EXS Wallet
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 py-12">
            <Card className="text-center p-6 border-2 border-gray-200">
              <div className="text-3xl mb-3">🥈</div>
              <h3 className="font-bold text-lg mb-1">Silver</h3>
              <p className="text-2xl font-bold text-primary mb-2">2%</p>
              <p className="text-sm text-muted-foreground">cashback em todas as locações</p>
            </Card>

            <Card className="text-center p-6 border-2 border-yellow-400 bg-yellow-50/50">
              <div className="text-3xl mb-3">🥇</div>
              <h3 className="font-bold text-lg mb-1">Gold</h3>
              <p className="text-2xl font-bold text-primary mb-2">3%</p>
              <p className="text-sm text-muted-foreground">a partir de R$ 50k em locações/ano</p>
            </Card>

            <Card className="text-center p-6 border-2 border-purple-400 bg-purple-50/50">
              <div className="text-3xl mb-3">💎</div>
              <h3 className="font-bold text-lg mb-1">Platinum</h3>
              <p className="text-2xl font-bold text-primary mb-2">5%</p>
              <p className="text-sm text-muted-foreground">a partir de R$ 150k em locações/ano</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated with company - show full wallet
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary-foreground/20 rounded-xl">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">EXS Wallet</h1>
                <p className="text-primary-foreground/80">{company.nome}</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-primary-foreground/70">Logado como</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <WalletCard company={company} />
            <TierProgress company={company} />
          </div>
          <div className="lg:col-span-2">
            <WalletTransactionList transactions={transactions || []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
