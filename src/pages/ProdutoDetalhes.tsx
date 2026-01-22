import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Info, Loader2, AlertCircle, CheckCircle, Clock, Wrench, ShoppingCart, Calendar, ChevronLeft, FileText, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CalendarioDisponibilidade from '@/components/produtos/CalendarioDisponibilidade';
import { ReservaConfirmDialog } from '@/components/reservas/ReservaConfirmDialog';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

import { differenceInDays, isBefore, isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSearchParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";


interface ProdutoDetalhe {
  id: string;
  nome: string;
  descricao: string;
  imagem: string | null;
  preco_diario: number;
  status: 'available' | 'rented' | 'maintenance' | 'disponivel' | 'alugado' | 'manutencao' | 'sold' | 'vendido';
  especificacoes: string[];
  commercial?: {
    isForSale: boolean;
    salePrice: number | null;
    dailyRate: number | null;
    monthlyRate: number | null;
  };
  technical?: {
    model?: string;
    specs?: Record<string, string>;
    catalogUrl?: string;
  };
}

const statusConfig: any = {
  available: {
    label: 'Disponível para locação',
    variant: 'default',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200'
  },
  rented: {
    label: 'Atualmente alugado',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  maintenance: {
    label: 'Em manutenção',
    variant: 'destructive',
    icon: Wrench,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  sold: {
    label: 'Vendido',
    variant: 'secondary',
    icon: CheckCircle,
    className: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  disponivel: { label: 'Disponível', variant: 'default', icon: CheckCircle, className: 'bg-green-100' },
  alugado: { label: 'Alugado', variant: 'secondary', icon: Clock, className: 'bg-blue-100' },
  manutencao: { label: 'Manutenção', variant: 'destructive', icon: Wrench, className: 'bg-yellow-100' },
  vendido: { label: 'Vendido', variant: 'secondary', icon: CheckCircle, className: 'bg-slate-100' }
};

const ProdutoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isMonthlyParam = searchParams.get('plan') === 'monthly';

  const [rentalMode, setRentalMode] = useState<'daily' | 'monthly'>(isMonthlyParam ? 'monthly' : 'daily');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: produto, isLoading: loadingProduto } = useQuery({
    queryKey: ['produto', id],
    queryFn: async () => {
      if (!id) throw new Error("ID não fornecido");
      const docRef = doc(db, 'rental_equipments', id);  // BOS collection
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data();

      // Mapeamento BOS → EXS
      return {
        id: docSnap.id,
        nome: data.name || "Equipamento",  // BOS usa 'name'
        descricao: data.description || data.notes || "",
        imagem: data.accessories?.[0]?.imageUrl || null,  // Imagem do primeiro acessório
        preco_diario: data.rentPrice || 0,  // BOS usa 'rentPrice'
        status: data.status === 'AVAILABLE' ? 'available' : 'unavailable',
        especificacoes: data.specifications || [],
        commercial: {
          isForSale: false,
          salePrice: null,
          dailyRate: data.rentPrice || 0,
          monthlyRate: data.monthlyRate || null
        },
        technical: data.technical || {}
      } as ProdutoDetalhe;
    },
    enabled: !!id
  });

  useEffect(() => {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const promoParam = searchParams.get('promo');

    if (startParam && endParam) {
      setDataInicio(parseISO(startParam));
      setDataFim(parseISO(endParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (produto && Number(produto.preco_diario) === 0 && rentalMode === 'daily') {
      setRentalMode('monthly');
    }
  }, [produto]);

  const { data: reservas = [], refetch: refetchReservas } = useQuery({
    queryKey: ['reservas-produto', id],
    queryFn: async () => {
      if (!id) return [];
      const reservasRef = collection(db, 'reservas');
      const q = query(
        reservasRef,
        where('produto_id', '==', id),
        where('status', 'in', ['pending', 'pending_approval', 'confirmed', 'confirmada', 'approved', 'rented'])
        // We exclude 'cancelled', 'rejected', etc.
        // Note: 'in' query supports up to 10 values.
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
    },
    enabled: !!id
  });

  // Fetch Upgrade Promotions for this product
  const { data: upgradePromotion } = useQuery({
    queryKey: ['upgrade-promo', id],
    queryFn: async () => {
      if (!id) return null;
      const q = query(
        collection(db, 'upgrades'),
        where('triggerProductId', '==', id),
        where('active', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
    },
    enabled: !!id
  });



  const diasLocacao = useMemo(() => {
    if (!dataInicio || !dataFim) return 0;
    return differenceInDays(dataFim, dataInicio) + 1;
  }, [dataInicio, dataFim]);

  const valorTotal = useMemo(() => {
    if (!produto) return 0;
    const promoParam = searchParams.get('promo');
    const baseDailyPrice = promoParam ? Number(promoParam) : Number(produto.preco_diario);

    const unitPrice = rentalMode === 'monthly'
      ? Number(produto.commercial?.monthlyRate || 0)
      : diasLocacao * baseDailyPrice;
    return unitPrice * quantity;
  }, [diasLocacao, produto, rentalMode, quantity, searchParams]);

  // Months for selection
  const upcomingMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = addMonths(now, i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return months;
  }, []);

  const handleMonthSelect = (monthValue: string) => {
    setSelectedMonth(monthValue);
    const [year, month] = monthValue.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1); // 1st of next month
    setDataInicio(start);
    setDataFim(end);
  };

  const isMonthOccupied = (monthValue: string) => {
    return reservas.some(r => {
      const bookingStart = parseISO(r.data_inicio);
      const [year, month] = monthValue.split('-').map(Number);
      const targetStart = new Date(year, month - 1, 1);
      return isSameDay(bookingStart, targetStart) && ['pending', 'pending_approval', 'confirmed', 'confirmada', 'approved', 'rented'].includes(r.status);
    });
  };

  const handleModeChange = (mode: string) => {
    setRentalMode(mode as 'daily' | 'monthly');
    setDataInicio(null);
    setDataFim(null);
    setSelectedMonth("");
    setQuantity(1);
  };

  const handleReservaSuccess = () => {
    setDataInicio(null);
    setDataFim(null);
    setSelectedMonth("");
    refetchReservas();
  };

  const handleCalendarSelect = (data: Date) => {
    if (!dataInicio || (dataInicio && dataFim)) {
      setDataInicio(data);
      setDataFim(null);
    } else {
      if (isBefore(data, dataInicio)) {
        setDataInicio(data);
      } else {
        setDataFim(data);
      }
    }
  };

  const handleSelectData = (inicio: Date | null, fim: Date | null) => {
    setDataInicio(inicio);
    setDataFim(fim);
  };

  const handleStartDateChange = (val: string) => {
    if (!val) {
      setDataInicio(null);
      return;
    }
    const date = new Date(val + 'T12:00:00');
    setDataInicio(date);
    if (dataFim && isBefore(dataFim, date)) {
      setDataFim(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    if (!val) {
      setDataFim(null);
      return;
    }
    const date = new Date(val + 'T12:00:00');
    if (dataInicio && isBefore(date, dataInicio)) {
      toast({
        title: "Período inválido",
        description: "A data de devolução deve ser após a retirada.",
        variant: "destructive"
      });
      return;
    }
    setDataFim(date);
  };

  const hasOverlap = useMemo(() => {
    if (!dataInicio || !dataFim || !reservas.length) return false;
    return reservas.some((r: any) => {
      const rStart = parseISO(r.data_inicio);
      const rEnd = parseISO(r.data_fim);
      return (dataInicio <= rEnd) && (dataFim >= rStart) &&
        ['pending', 'pending_approval', 'confirmed', 'confirmada', 'approved', 'rented'].includes(r.status);
    });
  }, [dataInicio, dataFim, reservas]);

  const handleAddToCartRent = () => {
    if (!produto || !dataInicio || !dataFim) return;

    if (hasOverlap) {
      toast({
        title: "Datas Indisponíveis",
        description: "O período selecionado já está reservado. Por favor, escolha outras datas.",
        variant: "destructive"
      });
      return;
    }

    const promoParam = searchParams.get('promo');
    const finalPrice = rentalMode === 'monthly'
      ? Number(produto.commercial?.monthlyRate || 0)
      : (promoParam ? Number(promoParam) : Number(produto.preco_diario || 0));

    addToCart({
      id: `${produto.id}-rent-${dataInicio.getTime()}-${dataFim.getTime()}${promoParam ? '-promo' : ''}`,
      productId: produto.id,
      productName: produto.nome,
      image: produto.imagem,
      type: 'rent',
      price: finalPrice,
      rentalPeriod: {
        start: dataInicio,
        end: dataFim,
        days: diasLocacao,
        monthlyPlan: rentalMode === 'monthly'
      },
      quantity: quantity
    });

    toast({
      title: "Item adicionado!",
      description: "Equipamento (Locação) adicionado ao carrinho.",
    });
  };

  const handleAddToCartSale = () => {
    if (!produto || !produto.commercial?.salePrice) return;

    addToCart({
      id: `${produto.id}-sale`,
      productId: produto.id,
      productName: produto.nome,
      image: produto.imagem,
      type: 'sale',
      price: Number(produto.commercial?.salePrice || 0),
      quantity: quantity
    });

    toast({
      title: "Item adicionado!",
      description: "Equipamento (Venda) adicionado ao carrinho.",
    });
  };

  if (loadingProduto) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Produto não encontrado.</p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao catálogo
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[produto.status] || statusConfig['available'];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-8 animate-fade-in container mx-auto px-4 py-8">
      <Link to="/">
        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Button>
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="aspect-[4/3] rounded-none overflow-hidden bg-slate-100 shadow-sm border border-slate-200 flex items-center justify-center">
            {produto.imagem ? (
              <img
                src={produto.imagem}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-slate-400">Sem imagem</span>
            )}
          </div>

          <Card className="border-border/50 shadow-md rounded-none">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2">{produto.nome}</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">{produto.descricao}</p>
                </div>
              </div>
              <Badge className={`w-fit gap-1.5 mt-3 ${status.className} border`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Especificações Técnicas
                </h4>
                {produto.especificacoes.length > 0 ? (
                  <ul className="space-y-2.5">
                    {produto.especificacoes.map((esp, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        {esp}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nenhuma especificação cadastrada.</p>
                )}
              </div>

              {produto.technical?.catalogUrl && (
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5 text-primary" asChild>
                    <a href={produto.technical.catalogUrl} target="_blank" rel="noreferrer">
                      <FileText className="h-4 w-4" />
                      Baixar Catálogo Técnico (PDF)
                    </a>
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                {Number(produto.preco_diario) > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gradient text-primary">
                      R$ {Number(produto.preco_diario).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground font-medium">/ dia</span>
                  </div>
                ) : !produto.commercial?.monthlyRate ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-400">
                      Sob Consulta
                    </span>
                  </div>
                ) : null}

                {produto.commercial?.monthlyRate && (
                  <div className={`${Number(produto.preco_diario) > 0 ? 'mt-2' : ''} flex items-baseline gap-2`}>
                    <span className={`${Number(produto.preco_diario) > 0 ? 'text-xl' : 'text-4xl'} font-bold text-primary/80`}>
                      R$ {Number(produto.commercial.monthlyRate).toLocaleString('pt-BR')}
                    </span>
                    <span className={`${Number(produto.preco_diario) > 0 ? 'text-xs' : 'text-base'} text-muted-foreground font-medium`}>
                      / mensal (mín. 30 dias)
                    </span>
                  </div>
                )}
              </div>


            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {produto.commercial?.monthlyRate && Number(produto.preco_diario) > 0 && (
            <Tabs value={rentalMode} onValueChange={handleModeChange} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2 rounded-none bg-slate-900/50 p-1">
                <TabsTrigger value="daily" className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-black font-bold">
                  Locação Diária
                </TabsTrigger>
                <TabsTrigger value="monthly" className="rounded-none data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold">
                  Plano Mensal 🔥
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {(rentalMode === 'monthly' || Number(produto.preco_diario) === 0) ? (
            <Card className="border-border/50 shadow-md rounded-none overflow-hidden">
              <CardHeader className="pb-4 bg-blue-950/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Selecione o Mês de Locação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-400">Escolha o mês desejado:</Label>
                    <Select value={selectedMonth} onValueChange={handleMonthSelect}>
                      <SelectTrigger className="w-full h-12 bg-slate-900/50 border-white/10 rounded-none text-lg">
                        <SelectValue placeholder="Selecione um mês..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 rounded-none text-white">
                        {upcomingMonths.map((m) => {
                          const occupied = isMonthOccupied(m.value);
                          return (
                            <SelectItem
                              key={m.value}
                              value={m.value}
                              disabled={occupied}
                              className="focus:bg-blue-600 focus:text-white capitalize"
                            >
                              {m.label} {occupied ? '(Ocupado)' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    * No plano mensal, o período é fixo do dia 01 ao dia 01 do mês seguinte.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-4 border-white/10 bg-slate-900/40 rounded-none overflow-hidden shadow-inner">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-start" className="text-[10px] uppercase text-slate-500 font-black tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-primary" />
                      Data de Retirada
                    </Label>
                    <Input
                      id="manual-start"
                      type="date"
                      className="bg-black/60 border-white/10 rounded-none focus:border-primary/50 text-white h-11 text-sm appearance-none"
                      style={{ colorScheme: 'dark' }}
                      value={dataInicio ? format(dataInicio, 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-end" className="text-[10px] uppercase text-slate-500 font-black tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3 text-primary" />
                      Data de Devolução
                    </Label>
                    <Input
                      id="manual-end"
                      type="date"
                      className="bg-black/60 border-white/10 rounded-none focus:border-primary/50 text-white h-11 text-sm appearance-none"
                      style={{ colorScheme: 'dark' }}
                      value={dataFim ? format(dataFim, 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <CalendarioDisponibilidade
                reservas={reservas}
                dataInicio={dataInicio}
                dataFim={dataFim}
                onSelectData={handleCalendarSelect}
              />
            </>
          )}

          <Card className="border-border/50 shadow-md rounded-none">
            <CardHeader className="pb-3 border-b border-border/10 bg-white/5">
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {dataInicio && dataFim ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-none p-3 border border-white/5">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Início</span>
                      <p className="font-semibold text-foreground mt-1">
                        {dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-none p-3 border border-white/5">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Retorno</span>
                      <p className="font-semibold text-foreground mt-1">
                        {dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {rentalMode === 'monthly' ? (
                    <div className="space-y-4 py-4 border-y border-white/10">
                      {Number(produto.preco_diario) > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400 uppercase tracking-wider">Custo Diário Padrão (30 dias)</span>
                          <span className="text-xl font-medium text-slate-500 line-through">
                            R$ {(Number(produto.preco_diario) * 30).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Valor do Plano Mensal</span>
                          <span className="text-4xl font-black text-primary glow-text">
                            R$ {Number(produto.commercial?.monthlyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-tighter animate-pulse">
                          Melhor Oferta
                        </div>
                      </div>

                      {Number(produto.preco_diario) > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 p-3 text-center">
                          <p className="text-green-400 text-sm font-bold">
                            🎉 Você economiza <span className="text-lg font-black underline">R$ {(Number(produto.preco_diario) * 30 - Number(produto.commercial?.monthlyRate)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> optando pelo plano mensal!
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 py-4 border-y border-white/10">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Valor por dia</span>
                      <span className="text-4xl font-black text-primary glow-text">
                        R$ {Number(produto.preco_diario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-sm text-muted-foreground mt-2">
                        Total para {diasLocacao} dia{diasLocacao > 1 ? 's' : ''}:{' '}
                        <span className="font-bold text-foreground">
                          R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 py-4 border-y border-border/10">
                    <span className="text-sm font-medium text-slate-400">Equipamentos:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-none border-white/10 hover:bg-white/5"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-none border-white/10 hover:bg-white/5"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full h-14 text-lg shadow-md hover:shadow-xl transition-all gap-3 rounded-none font-bold"
                    size="lg"
                    onClick={handleAddToCartRent}
                    style={{
                      background: rentalMode === 'monthly' ? 'linear-gradient(to right, #2563eb, #1e40af)' : undefined
                    }}
                    disabled={produto.status !== 'available' && produto.status !== 'disponivel'}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {(produto.status !== 'available' && produto.status !== 'disponivel')
                      ? 'Produto indisponível'
                      : rentalMode === 'monthly'
                        ? `Contratar ${quantity} Plano${quantity > 1 ? 's' : ''}`
                        : `Adicionar ${quantity} à Locação`
                    }
                  </Button>
                </>
              ) : (
                <div className="text-center py-10 bg-muted/20 rounded-none border border-dashed border-white/10">
                  <p className="text-muted-foreground text-sm">
                    {rentalMode === 'monthly'
                      ? 'Selecione um mês para ver'
                      : 'Selecione as datas no calendário'}
                    <br />
                    sua economia mensal.
                  </p>
                </div>
              )}

              {/* Upgrade Suggestion Card */}
              {hasOverlap && upgradePromotion && (
                <Card className="mt-4 border-blue-500/50 bg-blue-950/20 rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 p-2 rounded-none">
                        <ArrowUpCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-100 uppercase tracking-tighter text-sm">Upgrade Disponível! 🚀</h4>
                        <p className="text-xs text-blue-300 mt-1">
                          A {produto.nome} está ocupada nestas datas, mas temos uma oferta exclusiva para você!
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/40 p-3 border border-blue-500/20">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-blue-400 font-bold uppercase">Upgrade para</span>
                          <span className="font-bold text-white text-lg">{upgradePromotion.upgradeProductName}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 line-through">De R$ 600,00/dia</span>
                          <span className="font-black text-primary text-xl">R$ {upgradePromotion.promoPrice.toLocaleString('pt-BR')}/dia</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      asChild
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-none gap-2"
                    >
                      <Link to={`/produto/${upgradePromotion.upgradeProductId}?start=${dataInicio?.toISOString()}&end=${dataFim?.toISOString()}&promo=${upgradePromotion.promoPrice}`}>
                        Aceitar Upgrade e Ver Detalhes
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção de Venda (Full Width Row) */}
      {produto.commercial?.isForSale && (
        <div className="mt-8">
          <div className="bg-gradient-to-r from-blue-950/80 to-slate-950/80 border-l-[6px] border-blue-500 p-8 px-10 shadow-lg rounded-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600 text-white text-sm font-black px-4 py-1.5 uppercase tracking-widest rounded shadow-sm">
                    Venda
                  </span>
                  <span className="text-xl font-bold text-blue-100 flex items-center gap-2">
                    Disponível para compra imediata
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-300 uppercase tracking-wider">Valor de Investimento</p>
                  <p className="text-6xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-sm leading-tight">
                    {produto.commercial?.salePrice
                      ? `R$ ${produto.commercial.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Sob Consulta'
                    }
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-none border-white/10 hover:bg-white/5 text-white text-2xl"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="w-16 text-center font-bold text-3xl text-white">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-none border-white/10 hover:bg-white/5 text-white text-2xl"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-blue-900 hover:bg-blue-50 font-black h-14 px-8 rounded-none flex-1 sm:flex-none gap-3 shadow-lg group-hover:scale-105 transition-transform"
                  onClick={handleAddToCartSale}
                  disabled={produto.status === 'sold' || produto.status === 'vendido'}
                >
                  <ShoppingCart className="w-6 h-6" />
                  Comprar {quantity > 1 ? `${quantity} Unidades` : 'Equipamento'}
                </Button>
                <Button
                  size="lg"
                  className="h-16 px-10 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] font-bold text-2xl transition-all transform hover:-translate-y-1"
                  onClick={() => {
                    const message = `Olá! Tenho interesse na compra do equipamento: *${produto.nome}*.\n\nPreço anunciado: ${produto.commercial?.salePrice ? `R$ ${produto.commercial.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sob consulta'}`;
                    const whatsappUrl = `https://wa.me/5519994475349?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  Tenho Interesse
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {produto && dataInicio && dataFim && (
        <ReservaConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          produto={produto}
          dataInicio={dataInicio}
          dataFim={dataFim}
          diasLocacao={diasLocacao}
          valorTotal={valorTotal}
          isMonthly={rentalMode === 'monthly'}
          onSuccess={handleReservaSuccess}
        />
      )}
    </div>
  );
};

export default ProdutoDetalhes;