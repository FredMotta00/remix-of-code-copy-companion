import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Wallet, Search, Building2, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { WalletCard } from '@/components/wallet/WalletCard';
import { WalletTransactionList } from '@/components/wallet/WalletTransactionList';
import { TierProgress } from '@/components/wallet/TierProgress';

const WalletPage = () => {
  const [email, setEmail] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  
  const { company, transactions, isLoading } = useWallet(searchedEmail);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSearchedEmail(email.trim().toLowerCase());
    }
  };

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
        {/* Search Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Acessar Carteira da Empresa
            </CardTitle>
            <CardDescription>
              Digite o email corporativo para acessar sua carteira e histórico de cashback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="empresa@exemplo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button type="submit" size="lg" className="gap-2" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searchedEmail && !isLoading && !company && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Empresa não encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Não encontramos uma empresa cadastrada com o email <strong>{searchedEmail}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  A carteira é criada automaticamente na primeira reserva. 
                  Faça uma reserva para começar a acumular cashback!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {company && (
          <div className="grid lg:grid-cols-3 gap-6 pb-12">
            <div className="lg:col-span-1 space-y-6">
              <WalletCard company={company} />
              <TierProgress company={company} />
            </div>
            <div className="lg:col-span-2">
              <WalletTransactionList transactions={transactions || []} />
            </div>
          </div>
        )}

        {/* How it works */}
        {!searchedEmail && (
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
        )}
      </div>
    </div>
  );
};

export default WalletPage;
