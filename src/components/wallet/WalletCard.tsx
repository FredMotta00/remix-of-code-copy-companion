import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, Clock, Award } from 'lucide-react';
import { Company, TIER_CONFIG } from '@/lib/database.types';

interface WalletCardProps {
  company: Company;
}

export const WalletCard = ({ company }: WalletCardProps) => {
  const tierConfig = TIER_CONFIG[company.tier];
  
  return (
    <Card className="overflow-hidden">
      <div className="gradient-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <span className="font-semibold text-lg">EXS Wallet</span>
          </div>
          <Badge 
            variant="secondary" 
            className="bg-primary-foreground/20 text-primary-foreground border-0"
          >
            {tierConfig.icon} {tierConfig.name}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <p className="text-primary-foreground/70 text-sm">Saldo disponível</p>
          <p className="text-3xl font-bold">
            R$ {company.wallet_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Pendente</span>
          </div>
          <span className="font-semibold text-foreground">
            R$ {company.pending_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Cashback {tierConfig.name}</span>
          </div>
          <span className="font-semibold text-primary">
            {(tierConfig.cashbackPercentage * 100).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="h-4 w-4" />
            <span className="text-sm">Locações no ano</span>
          </div>
          <span className="font-semibold text-foreground">
            R$ {company.total_locacoes_ano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
