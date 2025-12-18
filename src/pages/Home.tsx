import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase, SlidersHorizontal, Loader2, Zap, Shield, Clock, Headphones, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProdutoCard from '@/components/produtos/ProdutoCard';
import { supabase } from '@/integrations/supabase/client';
import { Produto } from '@/lib/database.types';
const features = [{
  icon: Shield,
  title: 'Equipamentos Calibrados com Certificação RBC',
  desc: 'Todos calibrados e certificados'
}, {
  icon: Clock,
  title: 'Disponibilidade Rápida',
  desc: 'Disponível em até 24 horas (Após consulta em estoque)'
}, {
  icon: Headphones,
  title: 'Suporte Técnico',
  desc: 'Assistência especializada'
}, {
  icon: GraduationCap,
  title: 'Treinamento Operacional',
  desc: 'Gratuito presencial ou online'
}];
const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const {
    data: produtos = [],
    isLoading
  } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('produtos').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data as Produto[];
    }
  });
  const produtosFiltrados = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/).filter(word => word.length > 0);
    
    return produtos.filter(p => {
      // Busca em nome, descrição e especificações
      const textoCompleto = [
        p.nome,
        p.descricao,
        ...(p.especificacoes || [])
      ].join(' ').toLowerCase();
      
      // Se não há termo de busca, retorna todos
      if (searchWords.length === 0) {
        const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;
        return matchesStatus;
      }
      
      // Verifica se pelo menos uma palavra da busca está presente
      const matchesSearch = searchWords.some(word => textoCompleto.includes(word));
      const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [produtos, searchTerm, statusFilter]);
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-5 py-2.5 mb-8 border border-primary-foreground/10 animate-fade-up">
              <Zap className="w-4 h-4 text-primary-foreground" />
              <span className="text-primary-foreground/90 text-sm font-medium">Locação de Equipamentos Profissionais</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-6 tracking-tight animate-fade-up" style={{
            animationDelay: '0.1s'
          }}>
              Equipamentos de<br />
              <span className="text-primary-foreground/80">Alta Performance</span>
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/75 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{
            animationDelay: '0.2s'
          }}>
              Alugue equipamentos de teste de relés de proteção com total flexibilidade. 
              Verifique disponibilidade em tempo real e reserve online.
            </p>

            {/* Search Bar */}
            <div className="bg-card rounded-2xl shadow-xl p-2 max-w-2xl mx-auto animate-fade-up" style={{
            animationDelay: '0.3s'
          }}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Buscar equipamentos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 border-0 bg-muted/50 rounded-xl text-base focus-visible:ring-primary" />
                </div>
                <Button className="h-12 px-8 rounded-xl shadow-md hover:shadow-lg transition-all">
                  <Search className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Bar */}
      <section className="border-b border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => <div key={i} className="flex items-center gap-4 justify-center md:justify-start animate-fade-up" style={{
            animationDelay: `${0.4 + i * 0.1}s`
          }}>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Nossos Equipamentos</h2>
            <p className="text-muted-foreground">
              {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
            </p>
          </div>
          
          
        </div>

        {/* Grid */}
        {isLoading ? <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Carregando equipamentos...</p>
            </div>
          </div> : produtosFiltrados.length === 0 ? <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
            <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros ou a busca</p>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {produtosFiltrados.map((produto, i) => <div key={produto.id} className="animate-fade-up" style={{
          animationDelay: `${i * 0.05}s`
        }}>
                <ProdutoCard produto={produto} />
              </div>)}
          </div>}
      </section>
    </div>;
};
export default Home;