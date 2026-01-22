import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase, Loader2, Zap, Shield, Clock, Headphones, GraduationCap, Filter, Award, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import ProdutoCard from '@/components/produtos/ProdutoCard';
import { ProductFilters } from '@/components/produtos/ProductFilters';
import { Link, useSearchParams } from 'react-router-dom';
import { PromoBanner } from '@/components/home/PromoBanner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import Autoplay from 'embla-carousel-autoplay';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  imagem: string | null;
  preco_diario: number;
  preco_mensal?: number | null;
  status: string;
  especificacoes?: string[];
  category?: string;
  created_at?: string;
  updated_at?: string;
}

const features = [
  {
    icon: Shield,
    title: 'Equipamentos Calibrados com Certificação RBC',
    desc: 'Todos calibrados e certificados'
  },
  {
    icon: Clock,
    title: 'Disponibilidade Rápida',
    desc: 'Disponível em até 24 horas (Após consulta)'
  },
  {
    icon: Headphones,
    title: 'Suporte Técnico Vitalício',
    desc: 'Assistência especializada sempre disponível'
  },
  {
    icon: GraduationCap,
    title: 'Treinamento Operacional Gratuito',
    desc: 'Incluso presencial ou online'
  },
  {
    icon: Award,
    title: 'Garantia de 2 anos*',
    desc: 'Para compra de equipamentos'
  },
  {
    icon: BookOpen,
    title: 'Desconto no Instituto SPCS',
    desc: 'Cursos e treinamentos especializados'
  }
];

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // We keep 'filteredProducts' state to be updated by the Sidebar component
  const [activeProducts, setActiveProducts] = useState<Produto[]>([]);

  const {
    data: allProducts = [],
    isLoading
  } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const produtosRef = collection(db, 'rental_equipments');
      const q = query(produtosRef);
      const querySnapshot = await getDocs(q);

      const produtosFormatados: Produto[] = querySnapshot.docs.map(doc => {
        const data = doc.data();

        // BOS rental_equipments tem accessories array
        const accessories = data.accessories || [];
        const firstAccessory = accessories[0] || {};

        // Tentar pegar preço de diferentes fontes possíveis no BOS
        const dailyRate = data.rental?.dailyRate ||
          data.pricing?.daily ||
          data.dailyRate ||
          data.preco_diario ||
          100; // Fallback

        // Status: BOS pode usar 'active' ao invés de 'available'
        let mappedStatus = data.status || 'available';
        if (mappedStatus === 'active') mappedStatus = 'available';

        return {
          id: doc.id,
          nome: firstAccessory.name || data.name || data.nome || "Equipamento",
          descricao: data.description || data.descricao || data.notes || "",
          imagem: firstAccessory.imageUrl || data.imageUrl || data.imagem || null,
          preco_diario: dailyRate,
          preco_mensal: data.rental?.monthlyRate || data.pricing?.monthly || null,
          status: mappedStatus,
          especificacoes: data.specifications || data.especificacoes || [],
          created_at: data.createdAt?.toString() || data.created_at || new Date().toISOString(),
          category: data.category || '',
          updated_at: new Date().toISOString()
        };
      });

      return produtosFormatados;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
    }
  });

  const [searchParams] = useSearchParams();
  const isMonthlyPlan = searchParams.get('plan') === 'monthly';

  // Initialize activeProducts when data loads
  useEffect(() => {
    let filtered = allProducts;
    if (isMonthlyPlan) {
      filtered = allProducts.filter(p => p.preco_mensal && p.preco_mensal > 0);
    }
    setActiveProducts(filtered);
  }, [allProducts, isMonthlyPlan]);

  // Handle updates from sidebar
  const handleFilterChange = (filtered: Produto[]) => {
    // Also apply search term if present
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setActiveProducts(filtered);
      return;
    }

    const searchWords = term.split(/\s+/).filter(word => word.length > 0);
    const finalFiltered = filtered.filter(p => {
      const textoCompleto = [
        p.nome,
        p.descricao,
        ...(p.especificacoes || [])
      ].join(' ').toLowerCase();

      return searchWords.some(word => textoCompleto.includes(word));
    });

    setActiveProducts(finalFiltered);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        {/* ... Backgrounds same as before ... */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 mb-6 border border-white/20 animate-fade-up">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-white/90 text-sm font-medium">Locação de Equipamentos Profissionais</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Equipamentos de<br />
                <span className="text-primary">Alta Performance</span>
              </h1>
              <p className="text-base md:text-lg text-white/75 mb-6 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
                Alugue equipamentos de teste de relés de proteção com total flexibilidade.
                Verifique disponibilidade em tempo real e reserve online.
              </p>

              {/* Search Bar - affects local state only for display in hero, logic is in main area */}
              <div className="bg-card rounded-2xl shadow-xl p-2 max-w-xl mx-auto lg:mx-0 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, marca ou specs..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 border-0 bg-muted/50 rounded-xl text-base focus-visible:ring-primary"
                    />
                  </div>
                  <Button className="h-12 px-8 rounded-xl shadow-md hover:shadow-lg transition-all">
                    <Search className="w-5 h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Buscar</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Featured Carousel - Just a few random items */}
            <div className="hidden lg:block animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {!isLoading && allProducts.length > 0 && (
                <Carousel opts={{ align: "center", loop: true }} plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]} className="w-full max-w-md mx-auto">
                  <CarouselContent>
                    {allProducts.slice(0, 5).map((produto) => (
                      <CarouselItem key={produto.id}>
                        <Link to={`/produto/${produto.id}`}>
                          <Card className="bg-card/90 backdrop-blur-sm border-primary-foreground/10 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                            <div className="relative h-48 bg-muted">
                              {produto.imagem ? (
                                <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Briefcase className="w-16 h-16 opacity-30" /></div>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1">{produto.nome}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{produto.descricao}</p>
                              <p className="text-primary font-bold">R$ {produto.preco_diario.toLocaleString('pt-BR')}<span className="text-sm font-normal text-muted-foreground">/dia</span></p>
                            </CardContent>
                          </Card>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Bar */}
      <section className="border-b border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-4 justify-center md:justify-start animate-fade-up" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <PromoBanner />

      {/* Main Content Area: Sidebar + Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar (Desktop) */}
          <aside className="hidden md:block w-64 shrink-0 space-y-6">
            <div className="sticky top-20">
              <ProductFilters
                products={allProducts}
                categories={categories}
                onFilterChange={handleFilterChange}
              />
            </div>
          </aside>

          {/* Main Grid Area */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isMonthlyPlan ? 'Equipamentos para Aluguel Mensal' : 'Catálogo Completo'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {activeProducts.length} {activeProducts.length === 1 ? 'item encontrado' : 'itens encontrados'}
                </p>
              </div>
              {/* Mobile Filter Trigger */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="w-4 h-4" /> Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                      <SheetDescription>Refine sua busca por especificações técnicas.</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <ProductFilters products={allProducts} categories={categories} onFilterChange={handleFilterChange} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Carregando catálogo...</p>
              </div>
            ) : activeProducts.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
                <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Sem resultados</h3>
                <p className="text-muted-foreground">Tente limpar os filtros ou buscar por outro termo.</p>
                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">Limpar busca</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProducts.map((produto) => (
                  <ProdutoCard key={produto.id} produto={produto} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;