import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company, WalletTransaction, TIER_CONFIG, CompanyTier } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';

export const useWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoadingAuth(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch company by user_id
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!user?.id
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

  // Create company for current user
  const createCompanyMutation = useMutation({
    mutationFn: async ({ nome, cnpj }: { nome: string; cnpj?: string }) => {
      if (!user?.id || !user?.email) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('companies')
        .insert({ 
          nome, 
          email: user.email, 
          cnpj: cnpj || null,
          user_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast({
        title: 'Empresa cadastrada!',
        description: 'Sua carteira EXS Wallet foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cadastrar empresa',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Add cashback (earn) - called when reservation is created
  const addCashbackMutation = useMutation({
    mutationFn: async ({ 
      reservaId, 
      amount, 
      description 
    }: { 
      reservaId: string; 
      amount: number; 
      description: string;
    }) => {
      if (!company) throw new Error('Empresa não encontrada');

      // Create pending transaction
      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          company_id: company.id,
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
          pending_balance: (company.pending_balance || 0) + amount 
        })
        .eq('id', company.id);

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
      if (!company) throw new Error('Empresa não encontrada');

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
          wallet_balance: (company.wallet_balance || 0) + transaction.amount,
          pending_balance: Math.max(0, (company.pending_balance || 0) - transaction.amount)
        })
        .eq('id', company.id);

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
      reservaId, 
      amount, 
      description 
    }: { 
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
          company_id: company.id,
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
        .eq('id', company.id);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    }
  });

  // Update company annual total
  const updateAnnualTotalMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!company) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('companies')
        .update({ 
          total_locacoes_ano: (company.total_locacoes_ano || 0) + amount 
        })
        .eq('id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    }
  });

  // Calculate cashback for a given amount based on tier
  const calculateCashback = (amount: number, tier?: CompanyTier): number => {
    const tierToUse = tier || company?.tier || 'silver';
    const percentage = TIER_CONFIG[tierToUse].cashbackPercentage;
    return Math.round(amount * percentage * 100) / 100;
  };

  return {
    user,
    company,
    transactions,
    isLoading: isLoadingAuth || isLoadingCompany || isLoadingTransactions,
    isAuthenticated: !!user,
    createCompany: createCompanyMutation.mutateAsync,
    addCashback: addCashbackMutation.mutateAsync,
    releaseCashback: releaseCashbackMutation.mutateAsync,
    useBalance: useBalanceMutation.mutateAsync,
    updateAnnualTotal: updateAnnualTotalMutation.mutateAsync,
    calculateCashback,
    isCreatingCompany: createCompanyMutation.isPending
  };
};
