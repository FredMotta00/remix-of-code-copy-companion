import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company, WalletTransaction, TIER_CONFIG, CompanyTier } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export const useWallet = (email?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company by email
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company', email],
    queryFn: async () => {
      if (!email) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!email
  });

  // Fetch wallet transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['wallet-transactions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!company?.id
  });

  // Create or get company
  const createCompanyMutation = useMutation({
    mutationFn: async ({ nome, email, cnpj }: { nome: string; email: string; cnpj?: string }) => {
      // Check if company exists
      const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existing) return existing as Company;

      // Create new company
      const { data, error } = await supabase
        .from('companies')
        .insert({ nome, email, cnpj: cnpj || null })
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    }
  });

  // Add cashback (earn) - called when reservation is created
  const addCashbackMutation = useMutation({
    mutationFn: async ({ 
      companyId, 
      reservaId, 
      amount, 
      description 
    }: { 
      companyId: string; 
      reservaId: string; 
      amount: number; 
      description: string;
    }) => {
      // Create pending transaction
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          company_id: companyId,
          reserva_id: reservaId,
          type: 'earn',
          status: 'pending',
          amount,
          description
        })
        .select()
        .single();

      if (error) throw error;

      // Update company pending balance
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          pending_balance: (company?.pending_balance || 0) + amount 
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    }
  });

  // Release cashback (make available) - called when equipment is returned
  const releaseCashbackMutation = useMutation({
    mutationFn: async (reservaId: string) => {
      // Find pending transaction for this reservation
      const { data: transaction, error: findError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('reserva_id', reservaId)
        .eq('type', 'earn')
        .eq('status', 'pending')
        .maybeSingle();

      if (findError) throw findError;
      if (!transaction) return null;

      // Update transaction status
      const { error: updateTxError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'available' })
        .eq('id', transaction.id);

      if (updateTxError) throw updateTxError;

      // Update company balances
      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update({ 
          wallet_balance: (company?.wallet_balance || 0) + transaction.amount,
          pending_balance: Math.max(0, (company?.pending_balance || 0) - transaction.amount)
        })
        .eq('id', transaction.company_id);

      if (updateCompanyError) throw updateCompanyError;

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast({
        title: 'Cashback liberado!',
        description: 'O cashback foi adicionado à sua carteira.',
      });
    }
  });

  // Use wallet balance (burn)
  const useBalanceMutation = useMutation({
    mutationFn: async ({ 
      companyId, 
      reservaId, 
      amount, 
      description 
    }: { 
      companyId: string; 
      reservaId: string; 
      amount: number; 
      description: string;
    }) => {
      if (!company || company.wallet_balance < amount) {
        throw new Error('Saldo insuficiente');
      }

      // Create burn transaction
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          company_id: companyId,
          reserva_id: reservaId,
          type: 'burn',
          status: 'used',
          amount: -amount,
          description
        })
        .select()
        .single();

      if (error) throw error;

      // Update company balance
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          wallet_balance: company.wallet_balance - amount 
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    }
  });

  // Calculate cashback for a given amount based on tier
  const calculateCashback = (amount: number, tier: CompanyTier = 'silver'): number => {
    const percentage = TIER_CONFIG[tier].cashbackPercentage;
    return Math.round(amount * percentage * 100) / 100;
  };

  return {
    company,
    transactions,
    isLoading: isLoadingCompany || isLoadingTransactions,
    createCompany: createCompanyMutation.mutateAsync,
    addCashback: addCashbackMutation.mutateAsync,
    releaseCashback: releaseCashbackMutation.mutateAsync,
    useBalance: useBalanceMutation.mutateAsync,
    calculateCashback,
    isCreatingCompany: createCompanyMutation.isPending
  };
};
