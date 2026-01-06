import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 👇 Removemos o 'storage' e as funções de upload, mantemos apenas o banco (db)
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Package,
  Search,
  Upload,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react';

interface ProdutoForm {
  nome: string;
  descricao: string;
  especificacoes: string;
  preco_diario: string;
  status: 'available' | 'rented' | 'maintenance';
  modelo: string;
  // Agora a imagem é salva direto no form como string de texto
  imagemBase64: string; 
}

const initialForm: ProdutoForm = {
  nome: '',
  descricao: '',
  especificacoes: '',
  preco_diario: '',
  status: 'available',
  modelo: '',
  imagemBase64: ''
};

export default function AdminProdutos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoForm>(initialForm);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 👇 Função Mágica: Converte Arquivo para Texto (Base64)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limite de segurança: 1MB (o Firestore não aceita documentos maiores que isso)
      if (file.size > 1024 * 1024) {
        toast({
            title: "Imagem muito grande", 
            description: "Por favor, use imagens menores que 1MB.",
            variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Isso transforma a foto em algo tipo "data:image/png;base64,iVBORw0KGgo..."
        setForm(prev => ({ ...prev, imagemBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['admin-produtos'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.name,
          descricao: data.description,
          especificacoes: data.technical?.specs ? Object.values(data.technical.specs).join('\n') : '',
          preco_diario: data.commercial?.dailyRate,
          imagem: data.images?.[0] || '',
          status: data.status,
          modelo: data.technical?.model || ''
        };
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProdutoForm) => {
      
      // Monta o objeto para salvar
      const payload: any = {
        name: data.nome,
        description: data.descricao,
        status: data.status,
        commercial: {
          dailyRate: parseFloat(data.preco_diario),
          isForRent: true,
          isForSale: false,
          cashbackRate: 0.05
        },
        technical: {
          model: data.modelo,
          specs: data.especificacoes.split('\n').reduce((acc: any, line, index) => {
            if(line.trim()) acc[`spec_${index}`] = line.trim();
            return acc;
          }, {})
        },
        updatedAt: new Date().toISOString()
      };

      // LÓGICA DE IMAGEM:
      // Se o usuário selecionou uma nova imagem (Base64), salvamos ela no array images
      if (data.imagemBase64) {
        payload.images = [data.imagemBase64];
      } else if (!editingId && !data.imagemBase64) {
        // Se é produto novo e não tem imagem, salva array vazio
        payload.images = [];
      }
      // Se for edição e não mexeu na imagem, não mandamos o campo 'images', 
      // assim o Firestore mantém o que já estava lá.

      if (editingId) {
        const docRef = doc(db, 'inventory', editingId);
        await updateDoc(docRef, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        if(!payload.images) payload.images = [];
        await addDoc(collection(db, 'inventory'), payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-produtos'] });
      toast({
        title: 'Sucesso',
        description: editingId ? 'Produto atualizado' : 'Produto criado',
      });
      closeDialog();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar. Tente uma imagem menor.',
        variant: 'destructive',
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'inventory', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-produtos'] });
      toast({ title: 'Sucesso', description: 'Produto removido' });
      setDeleteDialog({ open: false, id: '' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao remover.', variant: 'destructive' });
    }
  });

  const openEditDialog = (produto: any) => {
    setEditingId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao,
      especificacoes: produto.especificacoes,
      preco_diario: String(produto.preco_diario),
      status: produto.status,
      modelo: produto.modelo,
      imagemBase64: produto.imagem || '' // Carrega a imagem existente no form
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.preco_diario) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
      case 'disponivel':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Disponível</Badge>;
      case 'rented':
      case 'alugado':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Alugado</Badge>;
      case 'maintenance':
      case 'manutencao':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Manutenção</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredProdutos = produtos?.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Produtos</h1>
          <p className="text-slate-500">Gerencie o catálogo de equipamentos</p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <CardTitle className="text-lg">Catálogo Atual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProdutos && filteredProdutos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço/Dia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {produto.imagem ? (
                            <img 
                              src={produto.imagem} 
                              alt={produto.nome}
                              className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                              <Package className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{produto.nome}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">
                              {produto.modelo}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-700">
                          R$ {Number(produto.preco_diario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(produto.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditDialog(produto)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteDialog({ open: true, id: produto.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                        id="nome"
                        value={form.nome}
                        onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do equipamento"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo / SKU</Label>
                    <Input
                        id="modelo"
                        value={form.modelo}
                        onChange={(e) => setForm(prev => ({ ...prev, modelo: e.target.value }))}
                        placeholder="Ex: UTS-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do equipamento"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="especificacoes">Especificações (uma por linha)</Label>
              <Textarea
                id="especificacoes"
                value={form.especificacoes}
                onChange={(e) => setForm(prev => ({ ...prev, especificacoes: e.target.value }))}
                placeholder="Tensão: 220V&#10;Potência: 1000W"
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preco">Preço/Dia (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.preco_diario}
                  onChange={(e) => setForm(prev => ({ ...prev, preco_diario: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(v: any) => setForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="rented">Alugado</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CAMPO DE UPLOAD BASE64 (Funciona sem Storage!) */}
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors text-center relative cursor-pointer">
                 <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {form.imagemBase64 ? (
                    <div className="flex flex-col items-center gap-2">
                        {/* Preview da imagem selecionada */}
                        <img 
                            src={form.imagemBase64} 
                            alt="Preview" 
                            className="h-20 w-auto rounded border shadow-sm"
                        />
                        <div className="text-green-600 font-medium text-xs flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" /> Imagem carregada
                        </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                        <span className="text-sm">Clique para selecionar foto</span>
                        <span className="text-xs text-slate-400 mt-1">(Máx 1MB)</span>
                    </div>
                  )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingId ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Produto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este produto do catálogo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDialog.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}