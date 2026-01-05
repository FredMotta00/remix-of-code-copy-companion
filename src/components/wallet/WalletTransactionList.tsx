import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2 } from 'lucide-react';
import { WalletTransaction } from '@/lib/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WalletTransactionListProps {
  transactions: WalletTransaction[];
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, className: 'bg-yellow-100 text-yellow-700' },
  available: { label: 'Disponível', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  used: { label: 'Utilizado', icon: CheckCircle2, className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado', icon: Clock, className: 'bg-red-100 text-red-700' }
};

export const WalletTransactionList = ({ transactions }: WalletTransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma transação ainda.</p>
            <p className="text-sm">Faça uma reserva para começar a acumular cashback!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Transações</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border">
            {transactions.map((transaction) => {
              const status = statusConfig[transaction.status];
              const StatusIcon = status.icon;
              const isEarn = transaction.type === 'earn';
              
              return (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isEarn ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isEarn ? (
                        <ArrowDownCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {isEarn ? 'Cashback' : 'Resgate'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description || (isEarn ? 'Cashback de reserva' : 'Desconto aplicado')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${isEarn ? 'text-green-600' : 'text-red-600'}`}>
                      {isEarn ? '+' : '-'} R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="secondary" className={status.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
