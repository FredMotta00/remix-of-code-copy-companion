import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CheckCircle2, Calendar, User, Mail, Phone, FileText, CreditCard } from 'lucide-react';

// 👇 Firebase Imports
import { db, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// 👇 Simplified Interface for the Product
interface ProdutoSimples {
  id: string;
  nome: string;
  imagem: string | null;
  preco_diario: number;
  descricao?: string; // Added optional description
}

interface ReservaConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: ProdutoSimples;
  dataInicio: Date;
  dataFim: Date;
  diasLocacao: number;
  valorTotal: number;
  onSuccess: () => void;
}

export const ReservaConfirmDialog = ({
  open,
  onOpenChange,
  produto,
  dataInicio,
  dataFim,
  diasLocacao,
  valorTotal,
  onSuccess
}: ReservaConfirmDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    observacoes: ''
  });

  // 👇 Auto-fill user data if logged in
  useEffect(() => {
    if (open && auth.currentUser) {
      setFormData(prev => ({
        ...prev,
        email: auth.currentUser?.email || '',
        // In the future, we can fetch name/phone from the 'users' collection here
      }));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha nome e email.',
        variant: 'destructive'
      });
      return;
    }

    // Check if user is logged in (optional, but good practice)
    const user = auth.currentUser;
    if (!user) {
       toast({
        title: 'Login necessário',
        description: 'Por favor, faça login para continuar.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // 👇 SAVING TO FIREBASE (Collection 'orders')
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        customerDetails: {
            name: formData.nome,
            email: formData.email,
            phone: formData.telefone,
            notes: formData.observacoes
        },
        items: [
          {
            productId: produto.id,
            productName: produto.nome,
            productImage: produto.imagem,
            dailyRate: Number(produto.preco_diario),
            type: "rent"
          }
        ],
        dates: {
          start: dataInicio.toISOString(),
          end: dataFim.toISOString(),
          days: diasLocacao
        },
        financial: {
          totalAmount: valorTotal,
          currency: "BRL",
          status: "pending_payment"
        },
        status: "pending_approval", // Order status
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      
      setTimeout(() => {
        toast({
          title: 'Solicitação enviada!',
          description: 'Você receberá a confirmação por email em breve.'
        });
        onSuccess();
        onOpenChange(false);
        setSuccess(false);
        setFormData({ nome: '', email: '', telefone: '', observacoes: '' });
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      toast({
        title: 'Erro ao criar reserva',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-50 duration-300">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Solicitação Enviada!</h3>
            <p className="text-slate-500 text-center">
              Recebemos seu pedido de reserva.<br />
              Nossa equipe entrará em contato em breve.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Confirmar Reserva</DialogTitle>
          <DialogDescription>
            Preencha seus dados para finalizar a solicitação.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do Produto */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-100">
          <div className="flex items-start gap-4">
            {produto.imagem ? (
                 <img 
                 src={produto.imagem} 
                 alt={produto.nome}
                 className="w-16 h-16 rounded-lg object-cover bg-white"
               />
            ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-xs text-slate-500">Sem foto</div>
            )}
           
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">{produto.nome}</h4>
              <p className="text-sm text-slate-500 line-clamp-1">{produto.descricao || "Sem descrição"}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>Início: <strong className="text-slate-900">{format(dataInicio, "dd 'de' MMM", { locale: ptBR })}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>Fim: <strong className="text-slate-900">{format(dataFim, "dd 'de' MMM", { locale: ptBR })}</strong></span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{diasLocacao} {diasLocacao === 1 ? 'dia' : 'dias'} × R$ {Number(produto.preco_diario).toLocaleString('pt-BR')}</span>
              <span className="text-slate-900">R$ {valorTotal.toLocaleString('pt-BR')}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900">Total Estimado</span>
              </div>
              <span className="text-lg font-bold text-primary">
                R$ {valorTotal.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Nome completo *
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              Telefone
            </Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Observações
            </Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Alguma observação sobre a reserva?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};