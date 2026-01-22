import { useQuery } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/client';
import { collection, query, getDocs, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck,
  Package,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReservaWithProduto, Produto } from '@/lib/database.types';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const reservasCol = collection(db, 'reservas');
      const produtosCol = collection(db, 'rental_equipments');

      const [reservasSnapshot, produtosSnapshot] = await Promise.all([
        getDocs(reservasCol),
        getDocs(produtosCol)
      ]);

      const reservas = reservasSnapshot.docs.map(d => d.data());
      const produtos = produtosSnapshot.docs.map(d => d.data());

      const pendentes = reservas.filter(r => r.status === 'pendente').length;
      const confirmadas = reservas.filter(r => r.status === 'confirmada').length;
      const valorTotal = reservas
        .filter(r => r.status === 'confirmada' || r.status === 'finalizada')
        .reduce((acc, r) => acc + Number(r.valor_total), 0);
      const produtosDisponiveis = produtos.filter(p => p.status === 'disponivel').length;

      return {
        pendentes,
        confirmadas,
        valorTotal,
        totalProdutos: produtos.length,
        produtosDisponiveis
      };
    }
  });

  const { data: recentReservas, isLoading: reservasLoading } = useQuery({
    queryKey: ['admin-recent-reservas'],
    queryFn: async () => {
      const q = query(
        collection(db, 'reservas'),
        orderBy('created_at', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);

      const reservasData = await Promise.all(
        querySnapshot.docs.map(async (reservaDoc) => {
          const reservaData = reservaDoc.data();
          let produto = null;

          if (reservaData.produto_id) {
            const produtoDocRef = doc(db, 'produtos', reservaData.produto_id);
            const produtoSnap = await getDoc(produtoDocRef);
            if (produtoSnap.exists()) {
              produto = { id: produtoSnap.id, ...produtoSnap.data() } as Produto;
            }
          }

          return {
            id: reservaDoc.id,
            ...reservaData,
            produtos: produto
          } as ReservaWithProduto;
        })
      );

      return reservasData;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'confirmada':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmada</Badge>;
      case 'finalizada':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Finalizada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de locação</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendentes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas Ativas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.confirmadas || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.produtosDisponiveis || 0}/{stats?.totalProdutos || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponíveis / Total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reservas confirmadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/produtos">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Produtos</p>
                  <p className="text-xs text-muted-foreground">Gerenciar catálogo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/pacotes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Pacotes</p>
                  <p className="text-xs text-muted-foreground">Criar combos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/promocoes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ArrowRight className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Promoções</p>
                  <p className="text-xs text-muted-foreground">Upgrades e ofertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/categorias">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Categorias</p>
                  <p className="text-xs text-muted-foreground">Organizar produtos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reservas Recentes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Últimas solicitações de locação
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/reservas" className="gap-2">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {reservasLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentReservas && recentReservas.length > 0 ? (
            <div className="space-y-4">
              {recentReservas.map((reserva) => (
                <div
                  key={reserva.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{reserva.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {(reserva.produtos as any)?.nome} • {format(new Date(reserva.data_inicio), "dd MMM", { locale: ptBR })} - {format(new Date(reserva.data_fim), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      R$ {Number(reserva.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {getStatusBadge(reserva.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma reserva encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
