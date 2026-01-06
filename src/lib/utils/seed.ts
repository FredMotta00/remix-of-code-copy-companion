
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export const seedDatabase = async () => {
  console.log("Iniciando Seed...");

  // 1. Criar um Produto Exemplo (Baseado na sua spec)
  try {
    await addDoc(collection(db, "inventory"), {
      name: "Analisador de Energia UTS-500",
      description: "Equipamento de alta precisão para medição...",
      status: "available",
      commercial: {
        dailyRate: 600.00,
        salePrice: 15000.00,
        isForRent: true,
        isForSale: false,
        cashbackRate: 0.08
      },
      technical: {
        model: "UTS-500",
        weight: "5kg",
        calibrationValidUntil: "2025-12-31"
      },
      images: ["https://placehold.co/600x400"],
      createdAt: new Date()
    });
    console.log("✅ Produto criado!");
  } catch (e) {
    console.error("Erro ao criar produto:", e);
  }

  // 2. Criar uma Empresa Exemplo
  try {
    await addDoc(collection(db, "companies"), {
      name: "Construtora Teste Ltda",
      cnpj: "00.000.000/0001-00",
      email: "financeiro@teste.com",
      loyalty: {
        tier: "silver",
        walletBalance: 0,
        totalAnnualRentals: 0
      },
      createdAt: new Date()
    });
    console.log("✅ Empresa criada!");
  } catch (e) {
    console.error("Erro ao criar empresa:", e);
  }
};