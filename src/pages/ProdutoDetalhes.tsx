import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Info, Loader2, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CalendarioDisponibilidade from '@/components/produtos/CalendarioDisponibilidade';
import { ReservaConfirmDialog } from '@/components/reservas/ReservaConfirmDialog';
// 👇 Importações do Firebase
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { differenceInDays, isBefore } from 'date-fns';

// 👇 Interface local para tipagem (já que removemos database.types do Supabase)
interface ProdutoDetalhe {
  id: string;
  nome: string;
  descricao: string;
  imagem: string | null;
  preco_diario: number;
  status: 'available' | 'rented' | 'maintenance' | 'disponivel' | 'alugado' | 'manutencao';
  especificacoes: string[];
}

// 👇 Atualizei as chaves para bater com o Firebase (inglês) e mantive o português por segurança
const statusConfig: any = {
  // Chaves do Firebase
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
  // Chaves antigas (Fallback)
  disponivel: { label: 'Disponível', variant: 'default', icon: CheckCircle, className: 'bg-green-100' },
  alugado: { label: 'Alugado', variant: 'secondary', icon: Clock, className: 'bg-blue-100' },
  manutencao: { label: 'Manutenção', variant: 'destructive', icon: Wrench, className: 'bg-yellow-100' }
};

const ProdutoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 1. Busca do Produto no Firebase
  const { data: produto, isLoading: loadingProduto } = useQuery({
    queryKey: ['produto', id],
    queryFn: async () => {
      if (!id) throw new Error("ID não fornecido");
      const docRef = doc(db, 'inventory', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      
      // Mapeia do formato Firestore para o formato da Tela
      return {
        id: docSnap.id,
        nome: data.name,
        descricao: data.description,
        imagem: data.images?.[0] || null,
        preco_diario: data.commercial?.dailyRate || 0,
        status: data.status,
        // Converte o objeto de specs em array de strings
        especificacoes: data.technical?.specs 
          ? Object.values(data.technical.specs).map(String) 
          : []
      } as ProdutoDetalhe;
    },
    enabled: !!id
  });

  // 2. Busca de Reservas (Para bloquear o calendário)
  const { data: reservas = [], refetch: refetchReservas } = useQuery({
    queryKey: ['reservas-produto', id],
    queryFn: async () => {
      // Como a estrutura de 'orders' ainda é nova, vamos retornar vazio por enquanto
      // para não quebrar a tela. Futuramente faremos a query na coleção 'orders'
      // filtrando onde items array-contains productId == id.
      
      // TODO: Implementar busca real quando tivermos pedidos criados
      return []; 
    },
    enabled: !!id
  });

  const handleSelectData = (data: Date) => {
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

  const diasLocacao = useMemo(() => {
    if (!dataInicio || !dataFim) return 0;
    return differenceInDays(dataFim, dataInicio) + 1;
  }, [dataInicio, dataFim]);

  const valorTotal = useMemo(() => {
    if (!produto) return 0;
    return diasLocacao * Number(produto.preco_diario);
  }, [diasLocacao, produto]);

  const handleReservaSuccess = () => {
    setDataInicio(null);
    setDataFim(null);
    refetchReservas();
    // Aqui poderíamos redirecionar para uma página de "Sucesso"
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
      {/* Voltar */}
      <Link to="/">
        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Button>
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Coluna Esquerda - Produto Info */}
        <div className="space-y-6">
          {/* Imagem */}
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200 flex items-center justify-center">
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

          {/* Info */}
          <Card className="border-border/50 shadow-md">
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

              <div className="pt-4 border-t border-border">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gradient text-primary">
                    R$ {Number(produto.preco_diario).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground font-medium">/ dia</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Calendário e Reserva */}
        <div className="space-y-6">
          <CalendarioDisponibilidade
            reservas={reservas}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onSelectData={handleSelectData}
          />

          {/* Resumo da Reserva */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumo da Reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataInicio && dataFim ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Início</span>
                      <p className="font-semibold text-foreground mt-1">
                        {dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Fim</span>
                      <p className="font-semibold text-foreground mt-1">
                        {dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 border-y border-border">
                    <span className="text-muted-foreground">
                      {diasLocacao} {diasLocacao === 1 ? 'dia' : 'dias'} × R$ {Number(produto.preco_diario).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-2xl font-bold text-gradient text-primary">
                      R$ {valorTotal.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <Button
                    className="w-full h-12 text-base shadow-md hover:shadow-lg transition-all"
                    size="lg"
                    onClick={() => setDialogOpen(true)}
                    disabled={produto.status !== 'available' && produto.status !== 'disponivel'}
                  >
                    {(produto.status !== 'available' && produto.status !== 'disponivel')
                      ? 'Produto indisponível' 
                      : 'Solicitar Reserva'
                    }
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground">
                    Selecione as datas no calendário<br />
                    para ver o valor total.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      {produto && dataInicio && dataFim && (
        <ReservaConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          produto={produto}
          dataInicio={dataInicio}
          dataFim={dataFim}
          diasLocacao={diasLocacao}
          valorTotal={valorTotal}
          onSuccess={handleReservaSuccess}
        />
      )}
    </div>
  );
};

export default ProdutoDetalhes;