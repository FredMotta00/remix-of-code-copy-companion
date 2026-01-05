import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wallet, Sparkles } from 'lucide-react';
import { Company } from '@/lib/database.types';

interface UseWalletToggleProps {
  company: Company | null;
  useWallet: boolean;
  onToggle: (value: boolean) => void;
  maxDiscount: number;
}

export const UseWalletToggle = ({ 
  company, 
  useWallet, 
  onToggle, 
  maxDiscount 
}: UseWalletToggleProps) => {
  if (!company || company.wallet_balance <= 0) {
    return null;
  }

  const discountAmount = Math.min(company.wallet_balance, maxDiscount);

  return (
    <div className={`
      p-4 rounded-xl border-2 transition-all
      ${useWallet 
        ? 'border-primary bg-primary/5' 
        : 'border-border bg-muted/30'
      }
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-full transition-colors
            ${useWallet ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <Label 
              htmlFor="use-wallet" 
              className="text-base font-semibold cursor-pointer flex items-center gap-2"
            >
              Usar Saldo EXS Wallet
              {useWallet && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
            </Label>
            <p className="text-sm text-muted-foreground">
              Saldo disponível: <span className="font-medium text-primary">
                R$ {company.wallet_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>
        
        <Switch
          id="use-wallet"
          checked={useWallet}
          onCheckedChange={onToggle}
        />
      </div>

      {useWallet && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Desconto a aplicar:</span>
            <span className="font-bold text-lg text-green-600">
              - R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
