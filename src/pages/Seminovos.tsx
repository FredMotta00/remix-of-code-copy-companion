import { useQuery } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Produto } from '@/lib/database.types';
import ProdutoCard from '@/components/produtos/ProdutoCard';
import { Button } from '@/components/ui/button';
import { Loader2, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

const Seminovos = () => {
    const { data: produtos, isLoading } = useQuery({
        queryKey: ['seminovos'],
        queryFn: async () => {
            // Fetch ALL items then filter for 'isForSale' == true
            // We do this client-side for now to avoid complex indexes, 
            // but in production we should index 'commercial.isForSale'
            const q = query(collection(db, 'products'));
            const querySnapshot = await getDocs(q);

            const items = querySnapshot.docs.map(doc => {
                const d = doc.data();
                // Helper to format specs
                const specsList = d.technical?.specs
                    ? Object.entries(d.technical.specs).map(([key, value]) => `${key}: ${value}`)
                    : d.especificacoes || [];

                return {
                    id: doc.id,
                    nome: d.name || d.nome,
                    descricao: d.description || d.descricao,
                    imagem: d.images?.[0] || d.imagem,
                    status: d.status,
                    // Map properties for ProdutoCard
                    preco_diario: d.commercial?.dailyRate || d.preco_diario || 0,
                    especificacoes: specsList,
                    commercial: d.commercial,
                    technical: d.technical
                };
            });

            // Filter for items that are marked FOR SALE
            return items.filter((item: any) => item.commercial?.isForSale === true);
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header Seminovos */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Tag className="w-6 h-6 text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Seminovos Certificados</h1>
                    </div>
                    <p className="text-slate-500 max-w-2xl">
                        Equipamentos de alta performance, calibrados e com garantia de procedência.
                        Uma oportunidade única de adquirir tecnologia de ponta por um valor acessível.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : produtos && produtos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {produtos.map((produto) => (
                            <ProdutoCard key={produto.id} produto={produto} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <Tag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum seminovo disponível</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            No momento não temos equipamentos à venda. Confira nosso catálogo de locação ou volte mais tarde.
                        </p>
                        <Link to="/">
                            <Button>Ver Catálogo de Locação</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Seminovos;
