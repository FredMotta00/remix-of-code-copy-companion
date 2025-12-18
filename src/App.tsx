import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import ProdutoDetalhes from "@/pages/ProdutoDetalhes";
import MinhasReservas from "@/pages/MinhasReservas";
import Configuracoes from "@/pages/Configuracoes";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminReservas from "@/pages/admin/AdminReservas";
import AdminProdutos from "@/pages/admin/AdminProdutos";

const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/produto/:id" element={<ProdutoDetalhes />} />
                <Route path="/minhas-reservas" element={<MinhasReservas />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>

              {/* Auth route */}
              <Route path="/auth" element={<Auth />} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="reservas" element={<AdminReservas />} />
                <Route path="produtos" element={<AdminProdutos />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
