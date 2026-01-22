import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 👇 Importamos o 'storage' e as funções de upload
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
import { Switch } from '@/components/ui/switch';
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
  preco_mensal: string;
  preco_venda: string;
  isForRent: boolean;
  isForMonthly: boolean;
  isForSale: boolean;
  status: 'available' | 'rented' | 'maintenance';
  modelo: string;
  // Agora a imagem é salva como URL, mas mantemos o preview
  imagemUrl: string;
  catalogUrl: string;
  category: string;
}

const initialForm: ProdutoForm = {
  nome: '',
  descricao: '',
  especificacoes: '',
  preco_diario: '',
  preco_mensal: '',
  preco_venda: '',
  isForRent: true,
  isForMonthly: false,
  isForSale: false,
  status: 'available',
  modelo: '',
  imagemUrl: '',
  catalogUrl: '',
  category: 'none'
};

export default function AdminProdutos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoForm>(initialForm);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  // Estados para os arquivos selecionados (ainda não subidos)
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Lógica de seleção de imagem com Preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCatalogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCatalog(file);
    }
  };

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['admin-produtos'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'rental_equipments'));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Helper to format specs
        const specsString = data.technical?.specs
          ? Object.entries(data.technical.specs).map(([k, v]) => `${k}: ${v}`).join('\n')
          : (data.especificacoes || []).join('\n');

        return {
          id: doc.id,
          nome: data.nome || data.name,
          descricao: data.descricao || data.description,
          especificacoes: specsString,
          preco_diario: data.commercial?.dailyRate || data.preco_diario || 0,
          preco_mensal: data.commercial?.monthlyRate || 0,
          preco_venda: data.commercial?.salePrice || 0,
          isForRent: data.commercial?.isForRent ?? true,
          isForMonthly: !!(data.commercial?.monthlyRate),
          isForSale: data.commercial?.isForSale || false,
          imagem: data.imagem || (data.images?.[0] || ''),
          status: data.status,
          modelo: data.technical?.model || data.sku || '',
          catalogUrl: data.technical?.catalogUrl || '',
          category: data.category || ''
        };
      });
    }
  });

  const { data: categorias } = useQuery({
    queryKey: ['admin-categorias'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProdutoForm) => {

      // 1. Upload da Imagem se houver
      let finalImageUrl = data.imagemUrl;
      if (selectedImage) {
        const storageRef = ref(storage, `products/${Date.now()}_${selectedImage.name}`);
        const snapshot = await uploadBytes(storageRef, selectedImage);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Upload do Catálogo se houver
      let finalCatalogUrl = data.catalogUrl;
      if (selectedCatalog) {
        const storageRef = ref(storage, `catalogs/${Date.now()}_${selectedCatalog.name}`);
        const snapshot = await uploadBytes(storageRef, selectedCatalog);
        finalCatalogUrl = await getDownloadURL(snapshot.ref);
      }

      // Parse specs string back to object
      const specsObject = data.especificacoes.split('\n').reduce((acc: any, line) => {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
          acc[key.trim()] = values.join(':').trim();
        } else if (key) {
          acc[`Spec`] = key.trim(); // Fallback for unstructured lines
        }
        return acc;
      }, {});

      // Monta o objeto UNIFICADO para salvar
      const payload: any = {
        name: data.nome,
        nome: data.nome,
        description: data.descricao,
        descricao: data.descricao,
        status: data.status,
        commercial: {
          dailyRate: data.isForRent ? parseFloat(data.preco_diario) : null,
          monthlyRate: data.isForMonthly ? parseFloat(data.preco_mensal) : null,
          isForRent: data.isForRent,
          isForSale: data.isForSale,
          salePrice: data.isForSale ? parseFloat(data.preco_venda) : null,
          cashbackRate: 0.05
        },
        technical: {
          model: data.modelo,
          specs: specsObject,
          catalogUrl: finalCatalogUrl
        },
        images: [finalImageUrl].filter(Boolean),
        imagem: finalImageUrl,
        preco_diario: parseFloat(data.preco_diario),
        category: data.category === 'none' ? '' : (data.category || null),
        updatedAt: new Date().toISOString()
      };
      // If editing and no new image, we don't touch image fields to preserve existing ones

      if (editingId) {
        const docRef = doc(db, 'inventory', editingId);
        await updateDoc(docRef, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        if (!payload.images) payload.images = [];
        await addDoc(collection(db, 'rental_equipments'), payload);
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
    onError: (error: any) => {
      console.error(error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Verifique o console para mais detalhes.',
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
      preco_diario: String(produto.preco_diario || ''),
      preco_mensal: String(produto.preco_mensal || ''),
      preco_venda: String(produto.preco_venda || ''),
      isForRent: produto.isForRent,
      isForMonthly: !!(produto.preco_mensal && produto.preco_mensal > 0),
      isForSale: produto.isForSale,
      status: produto.status,
      modelo: produto.modelo,
      imagemUrl: produto.imagem || '',
      catalogUrl: produto.catalogUrl || '',
      category: produto.category || 'none'
    });
    setImagePreview(produto.imagem || '');
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
    setSelectedImage(null);
    setSelectedCatalog(null);
    setImagePreview('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) {
      toast({ title: 'Erro', description: 'O nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (form.isForRent && !form.preco_diario) {
      toast({ title: 'Erro', description: 'Preço diário é obrigatório para aluguel', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
      case 'disponivel':
        return <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20">Disponível</Badge>;
      case 'rented':
      case 'alugado':
        return <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20">Alugado</Badge>;
      case 'maintenance':
      case 'manutencao':
        return <Badge className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20">Manutenção</Badge>;
      default:
        return <Badge variant="outline" className="border-white/10 text-slate-400">{status}</Badge>;
    }
  };

  const filteredProdutos = produtos?.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white glow-text">Gestão de Produtos</h1>
          <p className="text-slate-400">Gerencie o catálogo de equipamentos</p>
        </div>
        <Button onClick={openNewDialog} className="gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-primary hover:bg-primary/90 text-black font-semibold border-none">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-white/5 bg-[#0f1729]/60 backdrop-blur-md shadow-xl rounded-none">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#0f1729]/60 backdrop-blur-md shadow-xl overflow-hidden rounded-none">
        <CardHeader className="bg-white/5 border-b border-white/5 py-4 rounded-none">
          <CardTitle className="text-lg text-white">Catálogo Atual</CardTitle>
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
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-slate-400">Produto</TableHead>
                    <TableHead className="text-slate-400">Preço/Dia</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className="hover:bg-white/5 border-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {produto.imagem ? (
                            <img
                              src={produto.imagem}
                              alt={produto.nome}
                              className="h-12 w-12 rounded-none object-cover border border-white/10 bg-slate-950"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-none bg-slate-900 flex items-center justify-center border border-white/10">
                              <Package className="h-6 w-6 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{produto.nome}</p>
                            <p className="text-xs text-slate-400 line-clamp-1 max-w-[200px]">
                              {produto.modelo}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-200">
                          R$ {Number(produto.preco_diario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(produto.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                            onClick={() => openEditDialog(produto)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Categoria</SelectItem>
                  {categorias?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-4 border border-white/10 p-4 rounded-none bg-white/5">
              <h4 className="text-sm font-semibold text-white mb-2">Configurações Comerciais</h4>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {/* Aluguel Diário */}
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Aluguel Diário</Label>
                    <p className="text-[10px] text-slate-400">Habilitar reserva diária</p>
                  </div>
                  <Switch
                    checked={form.isForRent}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isForRent: checked }))}
                  />
                </div>

                {/* Aluguel Mensal */}
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Aluguel Mensal</Label>
                    <p className="text-[10px] text-slate-400">Habilitar plano mensal</p>
                  </div>
                  <Switch
                    checked={form.isForMonthly}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isForMonthly: checked }))}
                  />
                </div>

                {/* Venda */}
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Disponível Venda</Label>
                    <p className="text-[10px] text-slate-400">Habilitar compra direta</p>
                  </div>
                  <Switch
                    checked={form.isForSale}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isForSale: checked }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="preco" className={!form.isForRent ? "opacity-50" : ""}>Diária (R$)</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!form.isForRent}
                    value={form.preco_diario}
                    onChange={(e) => setForm(prev => ({ ...prev, preco_diario: e.target.value }))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preco_mensal" className={!form.isForMonthly ? "opacity-50" : ""}>Mensal (R$)</Label>
                  <Input
                    id="preco_mensal"
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!form.isForMonthly}
                    value={form.preco_mensal}
                    onChange={(e) => setForm(prev => ({ ...prev, preco_mensal: e.target.value }))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preco_venda" className={!form.isForSale ? "opacity-50" : ""}>Venda (R$)</Label>
                  <Input
                    id="preco_venda"
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!form.isForSale}
                    value={form.preco_venda}
                    onChange={(e) => setForm(prev => ({ ...prev, preco_venda: e.target.value }))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status do Equipamento</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: any) => setForm(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="h-9">
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

            {/* CAMPO DE UPLOAD DE IMAGEM */}
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-none p-4 hover:bg-slate-50 transition-colors text-center relative cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-auto rounded-none border shadow-sm"
                    />
                    <div className="text-green-600 font-medium text-xs flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Imagem selecionada
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-sm">Clique para selecionar foto</span>
                  </div>
                )}
              </div>
            </div>

            {/* CAMPO DE UPLOAD DE CATÁLOGO (PDF) */}
            <div className="space-y-2">
              <Label>Catálogo do Produto (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleCatalogChange}
                  className="flex-1"
                />
                {form.catalogUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={form.catalogUrl} target="_blank" rel="noreferrer">Ver Atual</a>
                  </Button>
                )}
              </div>
              {(selectedCatalog || form.catalogUrl) && (
                <div className="text-xs text-green-600 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {selectedCatalog ? `Arquivo selecionado: ${selectedCatalog.name}` : 'Catálogo já cadastrado'}
                </div>
              )}
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