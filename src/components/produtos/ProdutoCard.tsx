import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

// 👇 DEFINIMOS AQUI O QUE O CARD ACEITA RECEBER
// O '?' significa que o campo não é obrigatório (isso resolve seu erro vermelho!)
export interface ProdutoProps {
  produto: {
    id: string;
    nome: string;
    descricao: string;
    imagem: string | null;
    preco_diario: number;
    status: string;
    especificacoes?: string[]; // O erro sumirá por causa desse '?'
  };
}

const ProdutoCard = ({ produto }: ProdutoProps) => {
  // Função para mudar a cor da bolinha de status
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "available":
      case "disponivel":
        return { color: "bg-green-500", label: "Disponível", icon: CheckCircle2 };
      case "rented":
      case "alugado":
        return { color: "bg-amber-500", label: "Alugado", icon: AlertCircle };
      case "maintenance":
      case "manutencao":
        return { color: "bg-red-500", label: "Manutenção", icon: AlertCircle };
      default:
        return { color: "bg-slate-500", label: "Indisponível", icon: AlertCircle };
    }
  };

  const statusInfo = getStatusInfo(produto.status);
  const Icon = statusInfo.icon;

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200 bg-white group">
      {/* Imagem do Produto */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <span className="text-sm">Sem imagem</span>
          </div>
        )}
        
        {/* Etiqueta de Status (Canto Superior) */}
        <div className="absolute top-2 right-2">
          <Badge className={`${statusInfo.color} text-white border-none shadow-sm`}>
            <Icon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Título e Descrição */}
      <CardContent className="flex-1 p-4 space-y-2">
        <h3 className="font-bold text-lg text-slate-900 line-clamp-1" title={produto.nome}>
          {produto.nome}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
          {produto.descricao}
        </p>
        
        {/* Especificações Técnicas (Tags) */}
        {produto.especificacoes && produto.especificacoes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {produto.especificacoes.slice(0, 2).map((spec, i) => (
              <span key={i} className="text-[10px] px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">
                {spec}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      {/* Preço e Botão */}
      <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-auto bg-slate-50/50">
        <div className="flex flex-col mt-3">
          <span className="text-xs text-slate-500 font-medium">Diária a partir de</span>
          <span className="text-lg font-bold text-primary">
            R$ {produto.preco_diario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <Link to={`/produto/${produto.id}`} className="mt-3">
          <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
            Ver Detalhes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ProdutoCard;