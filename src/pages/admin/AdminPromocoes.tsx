import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    collection,
    query,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    MoreVertical,
    Tag,
    ArrowUpCircle,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface UpgradeRule {
    id: string;
    triggerProductId: string;
    triggerProductName: string;
    upgradeProductId: string;
    upgradeProductName: string;
    promoPrice: number;
    active: boolean;
    createdAt: any;
}

interface Product {
    id: string;
    nome: string;
}

const AdminPromocoes = () => {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<UpgradeRule | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [triggerProductId, setTriggerProductId] = useState('');
    const [upgradeProductId, setUpgradeProductId] = useState('');
    const [promoPrice, setPromoPrice] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Promo Rules
    const { data: rules = [], isLoading: loadingRules, refetch: refetchRules } = useQuery({
        queryKey: ['admin-upgrades'],
        queryFn: async () => {
            const q = query(collection(db, 'upgrades'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpgradeRule));
        }
    });

    // Fetch All Products for the selectors
    const { data: products = [] } = useQuery({
        queryKey: ['admin-products-minimal'],
        queryFn: async () => {
            const q = query(collection(db, 'products'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                nome: doc.data().nome || doc.data().name
            } as Product));
        }
    });

    const handleOpenDialog = (rule: UpgradeRule | null = null) => {
        if (rule) {
            setEditingRule(rule);
            setTriggerProductId(rule.triggerProductId);
            setUpgradeProductId(rule.upgradeProductId);
            setPromoPrice(rule.promoPrice.toString());
            setIsActive(rule.active);
        } else {
            setEditingRule(null);
            setTriggerProductId('');
            setUpgradeProductId('');
            setPromoPrice('');
            setIsActive(true);
        }
        setIsDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!triggerProductId || !upgradeProductId || !promoPrice) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha todos os campos corretamente.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const triggerProd = products.find(p => p.id === triggerProductId);
            const upgradeProd = products.find(p => p.id === upgradeProductId);

            const ruleData = {
                triggerProductId,
                triggerProductName: triggerProd?.nome || 'Produto desconhecido',
                upgradeProductId,
                upgradeProductName: upgradeProd?.nome || 'Produto desconhecido',
                promoPrice: parseFloat(promoPrice),
                active: isActive,
                updatedAt: serverTimestamp(),
            };

            if (editingRule) {
                await updateDoc(doc(db, 'upgrades', editingRule.id), ruleData);
                toast({ title: "Sucesso", description: "Regra de upgrade atualizada." });
            } else {
                await addDoc(collection(db, 'upgrades'), {
                    ...ruleData,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "Sucesso", description: "Nova regra de upgrade criada." });
            }

            setIsDialogOpen(false);
            refetchRules();
        } catch (error) {
            console.error("Error saving upgrade rule:", error);
            toast({
                title: "Erro ao salvar",
                description: "Ocorreu um erro ao tentar salvar a regra.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta regra?')) {
            try {
                await deleteDoc(doc(db, 'upgrades', id));
                toast({ title: "Sucesso", description: "Regra excluída com sucesso." });
                refetchRules();
            } catch (error) {
                toast({
                    title: "Erro ao excluir",
                    description: "Não foi possível excluir a regra.",
                    variant: "destructive"
                });
            }
        }
    };

    const filteredRules = rules.filter(rule =>
        rule.triggerProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.upgradeProductName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Promoções de Upgrade</h1>
                    <p className="text-muted-foreground">Gerencie as sugestões de upgrade para produtos ocupados.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-none">
                    <Plus className="h-4 w-4" />
                    Nova Regra
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm bg-card border border-border px-3 py-1 rounded-none shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar regras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-none focus-visible:ring-0 px-0 h-9 rounded-none"
                />
            </div>

            {loadingRules ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Carregando promoções...</p>
                </div>
            ) : (
                <div className="border border-border rounded-none overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead>Produto Indisponível (Gatilho)</TableHead>
                                <TableHead>Sugestão de Upgrade</TableHead>
                                <TableHead>Preço Promo (Diária)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRules.length > 0 ? (
                                filteredRules.map((rule) => (
                                    <TableRow key={rule.id} className="border-border hover:bg-muted/30">
                                        <TableCell className="font-medium">{rule.triggerProductName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                                                {rule.upgradeProductName}
                                            </div>
                                        </TableCell>
                                        <TableCell>R$ {rule.promoPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>
                                            {rule.active ? (
                                                <div className="flex items-center gap-1.5 text-green-500 text-xs font-bold uppercase">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Ativo
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase">
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Inativo
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-none border-border">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(rule)} className="gap-2 cursor-pointer rounded-none">
                                                        <Edit2 className="h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(rule.id)} className="gap-2 text-destructive cursor-pointer rounded-none">
                                                        <Trash2 className="h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                        Nenhuma regra de upgrade encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-none border-border">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Editar Promoção' : 'Nova Promoção de Upgrade'}</DialogTitle>
                        <DialogDescription>
                            Defina qual produto será sugerido como upgrade quando o produto original estiver ocupado.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="trigger">Produto Indisponível (Gatilho)</Label>
                            <Select value={triggerProductId} onValueChange={setTriggerProductId}>
                                <SelectTrigger className="rounded-none border-border bg-muted/30">
                                    <SelectValue placeholder="Selecione o produto alvo" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-border bg-popover">
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="rounded-none">
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="upgrade">Sugestão de Upgrade</Label>
                            <Select value={upgradeProductId} onValueChange={setUpgradeProductId}>
                                <SelectTrigger className="rounded-none border-border bg-muted/30">
                                    <SelectValue placeholder="Selecione o produto de upgrade" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-border bg-popover">
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="rounded-none">
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Preço Promocional (Diária)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">R$</span>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={promoPrice}
                                    onChange={(e) => setPromoPrice(e.target.value)}
                                    className="pl-10 rounded-none border-border h-11"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic font-medium">Este valor será aplicado temporariamente se o cliente aceitar o upgrade.</p>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-border bg-muted/20">
                            <div className="flex flex-col gap-0.5">
                                <Label htmlFor="active" className="cursor-pointer">Regra Ativa</Label>
                                <span className="text-[10px] text-muted-foreground">A sugestão só aparecerá se esta regra estiver ativa.</span>
                            </div>
                            <Switch
                                id="active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-border mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-none">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving} className="rounded-none gap-2 min-w-[120px]">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingRule ? 'Atualizar' : 'Criar Regra'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminPromocoes;
