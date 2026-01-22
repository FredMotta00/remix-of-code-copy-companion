/**
 * Script para adicionar usuário admin no BOS/EXS Locações
 * 
 * USO:
 * 1. Preencha seu email abaixo
 * 2. Execute: npx tsx scripts/addAdminBOS.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config do BOS
const firebaseConfig = {
    apiKey: "AIzaSyAhn85m2KDDeIZE51uHem5MHM0VwoNlWaU",
    authDomain: "comexs-r1g97.firebaseapp.com",
    projectId: "comexs-r1g97",
    storageBucket: "comexs-r1g97.firebasestorage.app",
    messagingSenderId: "1083099377370",
    appId: "1:1083099377370:web:abd9647fbd14f75ea4bfe3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdmin() {
    // ⚠️ PREENCHA SEU UID E EMAIL AQUI
    const adminUID = "SEU_UID_AQUI"; // Cole o UID do Firebase Auth
    const adminEmail = "seu-email@exemplo.com"; // Seu email
    const adminName = "Administrador"; // Seu nome

    console.log('🔧 Adicionando admin ao banco de dados...');

    try {
        // Adiciona na collection 'customers' com role admin
        await setDoc(doc(db, 'customers', adminUID), {
            uid: adminUID,
            email: adminEmail,
            name: adminName,
            role: 'admin',
            active: true,
            createdAt: new Date(),
            source: 'MANUAL_ADMIN',
            permissions: ['all'],
            roleId: 'ADMIN',
            cpfCnpj: '',
            phone: ''
        });

        console.log('✅ Admin adicionado com sucesso!');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 UID: ${adminUID}`);
        console.log('\n🎯 Agora você pode acessar /admin/login no site!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao adicionar admin:', error);
        process.exit(1);
    }
}

addAdmin();
