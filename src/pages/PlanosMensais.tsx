import { Check, Star, Zap, Shield, Clock, Headphones } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PlanosMensais = () => {
  const planos = [
    {
      nome: 'Básico',
      preco: 299,
      descricao: 'Ideal para pequenos eventos e uso ocasional',
      destaque: false,
      equipamentos: '1 equipamento',
      beneficios: [
        'Acesso a equipamentos básicos',
        'Suporte por e-mail',
        'Entrega gratuita na região',
        'Manutenção preventiva inclusa',
      ],
    },
    {
      nome: 'Profissional',
      preco: 599,
      descricao: 'Perfeito para produtoras e eventos regulares',
      destaque: true,
      equipamentos: 'Até 3 equipamentos',
      beneficios: [
        'Acesso a todos os equipamentos',
        'Suporte prioritário 24/7',
        'Entrega e retirada gratuita',
        'Manutenção preventiva inclusa',
        'Equipamento reserva garantido',
        'Desconto de 15% em aluguéis extras',
      ],
    },
    {
      nome: 'Enterprise',
      preco: 1299,
      descricao: 'Solução completa para grandes produções',
      destaque: false,
      equipamentos: 'Até 8 equipamentos',
      beneficios: [
        'Acesso ilimitado ao catálogo',
        'Gerente de conta dedicado',
        'Entrega express em até 4h',
        'Manutenção e suporte on-site',
        'Equipamentos reserva ilimitados',
        'Desconto de 30% em aluguéis extras',
        'Treinamento técnico incluso',
        'Seguro premium incluso',
      ],
    },
  ];

  const vantagensGerais = [
    {
      icon: Shield,
      titulo: 'Proteção Garantida',
      descricao: 'Todos os planos incluem seguro contra danos e roubo',
    },
    {
      icon: Clock,
      titulo: 'Flexibilidade Total',
      descricao: 'Troque de equipamento quando precisar, sem burocracia',
    },
    {
      icon: Headphones,
      titulo: 'Suporte Especializado',
      descricao: 'Equipe técnica pronta para ajudar em qualquer situação',
    },
    {
      icon: Zap,
      titulo: 'Equipamentos Atualizados',
      descricao: 'Sempre acesso às últimas versões e lançamentos',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-primary/10 to-background">
        <div className="container max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Star className="h-3 w-3 mr-1" />
            Novo
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Planos Mensais
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tenha acesso aos melhores equipamentos com previsibilidade de custos e benefícios exclusivos para assinantes.
          </p>
        </div>
      </section>

      {/* Planos */}
      <section className="py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {planos.map((plano) => (
              <Card
                key={plano.nome}
                className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                  plano.destaque
                    ? 'border-primary shadow-lg scale-105 md:scale-110'
                    : 'hover:border-primary/50'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plano.nome}</CardTitle>
                  <CardDescription>{plano.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold">R$ {plano.preco}</span>
                    <span className="text-muted-foreground">/mês</span>
                    <p className="text-sm text-primary font-medium mt-1">
                      {plano.equipamentos}
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {plano.beneficios.map((beneficio, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{beneficio}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plano.destaque ? 'default' : 'outline'}
                    size="lg"
                  >
                    Assinar Agora
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Vantagens Gerais */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Por que escolher um plano mensal?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vantagensGerais.map((vantagem) => (
              <Card key={vantagem.titulo} className="text-center border-none bg-card/50">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <vantagem.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{vantagem.titulo}</h3>
                  <p className="text-sm text-muted-foreground">
                    {vantagem.descricao}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {[
              {
                pergunta: 'Posso trocar de plano a qualquer momento?',
                resposta: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. A diferença será calculada proporcionalmente.',
              },
              {
                pergunta: 'Como funciona a troca de equipamentos?',
                resposta: 'Você pode solicitar a troca de equipamentos diretamente pelo app ou entrando em contato com nosso suporte. A entrega e retirada são feitas no mesmo dia.',
              },
              {
                pergunta: 'O que acontece se o equipamento apresentar defeito?',
                resposta: 'Realizamos a substituição imediata do equipamento sem custo adicional. Nosso suporte técnico está disponível para resolver qualquer problema.',
              },
              {
                pergunta: 'Existe fidelidade?',
                resposta: 'Não! Você pode cancelar seu plano a qualquer momento sem multas ou taxas de cancelamento.',
              },
            ].map((faq, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{faq.pergunta}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.resposta}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades e tenha acesso aos melhores equipamentos do mercado.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8">
            Ver Planos Disponíveis
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PlanosMensais;
