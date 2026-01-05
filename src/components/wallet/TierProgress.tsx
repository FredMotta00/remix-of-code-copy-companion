import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Company, TIER_CONFIG, CompanyTier } from '@/lib/database.types';
import { Award, ChevronRight } from 'lucide-react';

interface TierProgressProps {
  company: Company;
}

export const TierProgress = ({ company }: TierProgressProps) => {
  const tiers: CompanyTier[] = ['silver', 'gold', 'platinum'];
  const currentTierIndex = tiers.indexOf(company.tier);
  
  const getNextTier = (): { tier: CompanyTier; remaining: number } | null => {
    if (company.tier === 'platinum') return null;
    
    const nextTier = tiers[currentTierIndex + 1];
    const nextTierConfig = TIER_CONFIG[nextTier];
    const remaining = nextTierConfig.minAmount - company.total_locacoes_ano;
    
    return { tier: nextTier, remaining: Math.max(0, remaining) };
  };

  const nextTierInfo = getNextTier();
  
  const calculateProgress = (): number => {
    if (company.tier === 'platinum') return 100;
    
    const currentMin = TIER_CONFIG[company.tier].minAmount;
    const nextMin = TIER_CONFIG[tiers[currentTierIndex + 1]].minAmount;
    const progress = ((company.total_locacoes_ano - currentMin) / (nextMin - currentMin)) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Programa de Fidelidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier Display */}
        <div className="flex items-center justify-center gap-4">
          {tiers.map((tier, index) => {
            const config = TIER_CONFIG[tier];
            const isActive = tier === company.tier;
            const isPast = index < currentTierIndex;
            
            return (
              <div key={tier} className="flex items-center">
                <div 
                  className={`
                    flex flex-col items-center p-4 rounded-xl transition-all
                    ${isActive ? 'bg-primary/10 scale-110 shadow-lg' : 'bg-muted/50'}
                  `}
                >
                  <span className="text-2xl mb-1">{config.icon}</span>
                  <span className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {config.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(config.cashbackPercentage * 100).toFixed(0)}% cashback
                  </span>
                </div>
                {index < tiers.length - 1 && (
                  <ChevronRight className={`h-5 w-5 mx-2 ${isPast || isActive ? 'text-primary' : 'text-muted-foreground/30'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress to Next Tier */}
        {nextTierInfo && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progresso para {TIER_CONFIG[nextTierInfo.tier].name}
              </span>
              <span className="font-medium text-foreground">
                {calculateProgress().toFixed(0)}%
              </span>
            </div>
            <Progress value={calculateProgress()} className="h-3" />
            <p className="text-sm text-muted-foreground text-center">
              Faltam <span className="font-semibold text-primary">
                R$ {nextTierInfo.remaining.toLocaleString('pt-BR')}
              </span> em locações para o próximo nível
            </p>
          </div>
        )}

        {company.tier === 'platinum' && (
          <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
            <p className="text-lg font-semibold text-purple-700">
              🎉 Parabéns! Você é Platinum!
            </p>
            <p className="text-sm text-purple-600">
              Você possui o maior nível de cashback: 5%
            </p>
          </div>
        )}

        {/* Tier Benefits */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {tiers.map((tier) => {
            const config = TIER_CONFIG[tier];
            return (
              <div 
                key={tier} 
                className={`p-3 rounded-lg ${tier === company.tier ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {tier === 'silver' ? 'Até R$ 50k' : tier === 'gold' ? 'R$ 50k - 150k' : 'Acima de R$ 150k'}
                </p>
                <p className={`text-lg font-bold ${tier === company.tier ? 'text-primary' : 'text-foreground'}`}>
                  {(config.cashbackPercentage * 100).toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
