import { useState } from 'react';
import { Calendar, MapPin, Search, Check, Truck, Shield, Clock, Headphones, ChevronRight, Home } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const PlanosMensais = () => {
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'entrega'>('retirada');
  const [endereco, setEndereco] = useState('');
  const [dataRetirada, setDataRetirada] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState('');

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos-mensal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('status', 'disponivel')
        .order('preco_diario', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const calcularPrecoMensal = (precoDiario: number) => {
    // Desconto de 30% para aluguel mensal
    return Math.round(precoDiario * 30 * 0.7);
  };

  const beneficios = [
    {
      icon: Shield,
      titulo: 'Seguro Incluso',
      descricao: 'Proteção completa durante todo o período de locação',
    },
    {
      icon: Truck,
      titulo: 'Entrega ou Retirada',
      descricao: 'Escolha receber em casa ou retirar em nosso local',
    },
    {
      icon: Clock,
      titulo: 'Flexibilidade',
      descricao: 'Mínimo de 30 dias com possibilidade de extensão',
    },
    {
      icon: Headphones,
      titulo: 'Suporte Técnico',
      descricao: 'Assistência especializada 24 horas por dia',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section com formulário */}
      <section className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                Até 30% OFF
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Aluguel Mensal
              </h1>
              <p className="text-xl opacity-90 mb-6">
                Alugue equipamentos por períodos maiores e economize. 
                Ideal para projetos de longa duração, produções e eventos recorrentes.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>Mínimo de 30 dias de locação</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>Desconto especial de até 30%</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  <span>Entregamos ou você retira no local</span>
                </li>
              </ul>
            </div>

            {/* Formulário de Busca */}
            <Card className="bg-card/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground">Alugue um equipamento mensal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle Retirada/Entrega */}
                <div className="space-y-2">
                  <Label className="text-foreground">Como você prefere?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={tipoEntrega === 'retirada' ? 'default' : 'outline'}
                      className="gap-2"
                      onClick={() => setTipoEntrega('retirada')}
                    >
                      <MapPin className="h-4 w-4" />
                      Retirar no local
                    </Button>
                    <Button
                      type="button"
                      variant={tipoEntrega === 'entrega' ? 'default' : 'outline'}
                      className="gap-2"
                      onClick={() => setTipoEntrega('entrega')}
                    >
                      <Truck className="h-4 w-4" />
                      Receber em casa
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco" className="text-foreground">
                    {tipoEntrega === 'retirada' ? 'Local de Retirada' : 'Endereço de Entrega'}
                  </Label>
                  <div className="relative">
                    {tipoEntrega === 'retirada' ? (
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      id="endereco"
                      placeholder={tipoEntrega === 'retirada' ? 'Selecione o local de retirada' : 'Digite seu endereço completo'}
                      className="pl-10"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                    />
                  </div>
                  {tipoEntrega === 'entrega' && (
                    <p className="text-xs text-muted-foreground">
                      Entregamos em toda a região metropolitana
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataRetirada" className="text-foreground">
                      {tipoEntrega === 'retirada' ? 'Data de Retirada' : 'Data de Entrega'}
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dataRetirada"
                        type="date"
                        className="pl-10"
                        value={dataRetirada}
                        onChange={(e) => setDataRetirada(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataDevolucao" className="text-foreground">Data de Devolução</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dataDevolucao"
                        type="date"
                        className="pl-10"
                        value={dataDevolucao}
                        onChange={(e) => setDataDevolucao(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full gap-2" size="lg">
                  <Search className="h-4 w-4" />
                  Buscar Equipamentos
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* O que é aluguel mensal */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">O que é o Aluguel Mensal?</h2>
              <p className="text-muted-foreground mb-4">
                O aluguel mensal é perfeito para quem precisa de equipamentos por períodos mais longos. 
                Com o período mínimo de 30 dias, você tem a flexibilidade de escolher o equipamento 
                que melhor atende às suas necessidades.
              </p>
              <p className="text-muted-foreground mb-6">
                Tenha a liberdade de usar quando quiser, sem se preocupar com os custos de manutenção 
                e as responsabilidades de ter um equipamento próprio. Economize até 30% em comparação 
                com o aluguel diário.
              </p>
              <Button variant="outline" className="gap-2">
                Saiba mais
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {beneficios.map((beneficio) => (
                <Card key={beneficio.titulo} className="text-center">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <beneficio.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{beneficio.titulo}</h3>
                    <p className="text-xs text-muted-foreground">{beneficio.descricao}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Equipamentos disponíveis */}
      <section className="py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Equipamentos para Aluguel Mensal</h2>
              <p className="text-muted-foreground">
                Confira nossos equipamentos disponíveis com preços especiais para locação mensal
              </p>
            </div>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtos?.slice(0, 6).map((produto) => {
                const precoMensal = calcularPrecoMensal(produto.preco_diario);
                const precoDiarioTotal = produto.preco_diario * 30;

                return (
                  <Card key={produto.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="relative h-48 bg-muted">
                      {produto.imagem ? (
                        <img
                          src={produto.imagem}
                          alt={produto.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">
                        30% OFF
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{produto.nome}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {produto.descricao}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground line-through">
                            R$ {precoDiarioTotal.toLocaleString('pt-BR')}/mês
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {precoMensal.toLocaleString('pt-BR')}
                            <span className="text-sm font-normal text-muted-foreground">/mês</span>
                          </p>
                        </div>
                        <Link to={`/produto/${produto.id}`}>
                          <Button size="sm">
                            Alugar
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para economizar?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco e solicite um orçamento personalizado para o seu projeto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Solicitar Orçamento
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Falar com Consultor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlanosMensais;
