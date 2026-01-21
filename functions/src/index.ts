import * as logger from "firebase-functions/logger";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import axios from "axios";
import { defineSecret } from "firebase-functions/params";

// Configurações do Asaas
const ASAAS_API_KEY = defineSecret("ASAAS_API_KEY");
const ASAAS_URL = "https://sandbox.asaas.com/api/v3";


admin.initializeApp();

/**
 * Helper para obter instância do Firestore de forma lazy
 * Evita timeouts durante o deploy/inicialização do módulo
 */
const getDb = () => admin.firestore();

/**
 * Valida se uma nova reserva tem conflito de datas
 * Trigger: Quando uma nova reserva é criada
 */
export const validateReservationOnCreate = onDocumentCreated(
    "reservas/{reservaId}",
    async (event) => {

        const snap = event.data;
        if (!snap) {
            return;
        }

        const newReservation = snap.data();
        const reservaId = event.params.reservaId;

        try {
            const db = getDb();
            logger.info(`🔍 Validando reserva ${reservaId} para produto ${newReservation.produto_id}`);

            // Ignorar se já foi processada
            if (newReservation.validated === true) {
                logger.info("✅ Reserva já validada anteriormente");
                return;
            }

            // Buscar outras reservas ATIVAS do mesmo produto
            const conflictingReservations = await db
                .collection("reservas")
                .where("produto_id", "==", newReservation.produto_id)
                .where("status", "in", [
                    "pending",
                    "pending_approval",
                    "confirmed",
                    "confirmada",
                    "approved",
                    "rented",
                ])
                .get();

            // Verificar conflitos de data
            const newStart = new Date(newReservation.data_inicio);
            const newEnd = new Date(newReservation.data_fim);

            let hasConflict = false;
            let conflictingReservaId = null;

            for (const doc of conflictingReservations.docs) {
                // Ignorar a própria reserva
                if (doc.id === reservaId) continue;

                const data = doc.data();
                const existingStart = new Date(data.data_inicio);
                const existingEnd = new Date(data.data_fim);

                // Lógica de sobreposição: (StartA <= EndB) AND (EndA >= StartB)
                if (newStart <= existingEnd && newEnd >= existingStart) {
                    hasConflict = true;
                    conflictingReservaId = doc.id;
                    logger.info(`⚠️ Conflito detectado com reserva ${doc.id}`);
                    break;
                }
            }

            if (hasConflict) {
                // 🚨 CONFLITO DETECTADO - Cancelar reserva
                await snap.ref.update({
                    status: "rejected",
                    rejection_reason: "conflict_dates",
                    conflicting_reservation_id: conflictingReservaId,
                    validated: true,
                    validated_at: admin.firestore.FieldValue.serverTimestamp(),
                });

                logger.warn(`❌ Reserva ${reservaId} REJEITADA por conflito`);

                // Opcional: Cancelar a ordem associada
                if (newReservation.order_id) {
                    await db.collection("orders").doc(newReservation.order_id).update({
                        status: "rejected",
                        rejection_reason: "reservation_conflict",
                    });
                }

                return;
            }

            // ✅ SEM CONFLITO - Marcar como validada
            await snap.ref.update({
                validated: true,
                validated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`✅ Reserva ${reservaId} APROVADA (sem conflitos)`);

            return;
        } catch (error) {
            logger.error(`❌ Erro ao validar reserva ${reservaId}:`, error);

            // Marcar reserva com erro
            await snap.ref.update({
                validation_error: true,
                validation_error_message: String(error),
            });

            return;
        }
    }
);

/**
 * Cloud Function HTTP para validar manualmente uma reserva
 * Útil para revalidações ou testes
 */
export const validateReservation = onCall(async (request) => {
    // Verificar autenticação
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Usuário não autenticado"
        );
    }

    const { reservaId } = request.data;

    if (!reservaId) {
        throw new HttpsError(
            "invalid-argument",
            "reservaId é obrigatório"
        );
    }

    try {
        const db = getDb();
        const reservaDoc = await db.collection("reservas").doc(reservaId).get();

        if (!reservaDoc.exists) {
            throw new HttpsError(
                "not-found",
                "Reserva não encontrada"
            );
        }

        const reserva = reservaDoc.data()!;

        // Buscar conflitos
        const conflictingReservations = await db
            .collection("reservas")
            .where("produto_id", "==", reserva.produto_id)
            .where("status", "in", [
                "pending",
                "pending_approval",
                "confirmed",
                "confirmada",
                "approved",
                "rented",
            ])
            .get();

        const newStart = new Date(reserva.data_inicio);
        const newEnd = new Date(reserva.data_fim);

        const conflicts: string[] = [];

        for (const doc of conflictingReservations.docs) {
            if (doc.id === reservaId) continue;

            const data = doc.data();
            const existingStart = new Date(data.data_inicio);
            const existingEnd = new Date(data.data_fim);

            if (newStart <= existingEnd && newEnd >= existingStart) {
                conflicts.push(doc.id);
            }
        }

        return {
            reservaId,
            hasConflict: conflicts.length > 0,
            conflicts,
            message: conflicts.length > 0
                ? `Encontrados ${conflicts.length} conflito(s)`
                : "Sem conflitos detectados",
        };
    } catch (error) {
        logger.error("Erro ao validar:", error);
        throw new HttpsError("internal", String(error));
    }
});

/**
 * Cloud Function para gerar cobranças no Asaas
 */
export const criarCobrancaAsaas = onCall({
    secrets: [ASAAS_API_KEY]
}, async (request) => {
    // 1. Verificar autenticação
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Usuário não autenticado"
        );
    }

    const { valor, cpfCnpj, nome, formaPagamento } = request.data;

    // Validação básica
    if (!valor || !cpfCnpj || !nome || !formaPagamento) {
        throw new HttpsError(
            "invalid-argument",
            "Campos obrigatórios: valor, cpfCnpj, nome, formaPagamento"
        );
    }

    try {
        const asaasHeaders = {
            "access_token": ASAAS_API_KEY.value(),
            "Content-Type": "application/json"
        };

        // PASSO A: Buscar ou Criar Cliente
        logger.info(`🔍 Buscando cliente no Asaas: ${cpfCnpj}`);
        const customerSearch = await axios.get(`${ASAAS_URL}/customers?cpfCnpj=${cpfCnpj}`, {
            headers: asaasHeaders
        });

        let customerId = "";

        if (customerSearch.data.data && customerSearch.data.data.length > 0) {
            customerId = customerSearch.data.data[0].id;
            logger.info(`✅ Cliente encontrado: ${customerId}`);
        } else {
            logger.info("🆕 Cliente não encontrado. Criando novo cliente...");
            const newCustomer = await axios.post(`${ASAAS_URL}/customers`, {
                name: nome,
                cpfCnpj: cpfCnpj
            }, { headers: asaasHeaders });

            customerId = newCustomer.data.id;
            logger.info(`✅ Cliente criado com ID: ${customerId}`);
        }

        // PASSO B: Gerar Cobrança
        // Definir data de vencimento para daqui a 3 dias
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const dueDateString = dueDate.toISOString().split("T")[0];

        logger.info(`💸 Gerando cobrança de R$ ${valor} (${formaPagamento}) para customer ${customerId}`);

        const paymentResponse = await axios.post(`${ASAAS_URL}/payments`, {
            customer: customerId,
            billingType: formaPagamento, // PIX, BOLETO, CREDIT_CARD, etc
            value: valor,
            dueDate: dueDateString,
            description: "Locação de Equipamentos - EXS Solutions"
        }, { headers: asaasHeaders });

        logger.info("✅ Cobrança gerada com sucesso!");

        return {
            sucesso: true,
            id: paymentResponse.data.id,
            link: paymentResponse.data.invoiceUrl,
            pix: paymentResponse.data.bankSlipUrl
        };

    } catch (error: any) {
        logger.error("❌ Erro na integração com Asaas:", error.response?.data || error.message);

        // Extrair mensagem de erro original do Asaas se disponível
        const asaasErrorMessage = error.response?.data?.errors?.[0]?.description || error.message;

        throw new HttpsError(
            "internal",
            `Erro no Asaas: ${asaasErrorMessage}`
        );
    }
});

// Adicionar ao final do arquivo functions/src/index.ts

/**
 * Webhook para receber notificações do Asaas
 * URL será: https://[PROJECT_ID].cloudfunctions.net/handleAsaasWebhook
 */
export const handleAsaasWebhook = onRequest(async (req, res) => {
    // 1. Aceitar apenas POST
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const body = req.body;
        const event = body.event;

        logger.info("🔔 Webhook recebido do Asaas:", {
            event,
            paymentId: body.payment?.id
        });

        // 2. Validar estrutura básica
        if (!event || !body.payment) {
            logger.warn("⚠️ Webhook inválido: faltando event ou payment");
            res.status(400).send("Invalid webhook payload");
            return;
        }

        const paymentId = body.payment.id;

        // 3. Mapear eventos Asaas para status de pedidos
        let newStatus: string | null = null;

        switch (event) {
            case "PAYMENT_CONFIRMED":
                newStatus = "payment_confirmed";
                logger.info("✅ Pagamento confirmado!");
                break;
            case "PAYMENT_RECEIVED":
                newStatus = "payment_received";
                logger.info("💰 Pagamento recebido!");
                break;
            case "PAYMENT_OVERDUE":
                newStatus = "overdue";
                logger.warn("⏰ Pagamento vencido");
                break;
            case "PAYMENT_DELETED":
            case "PAYMENT_REFUND_REQUESTED":
                newStatus = "cancelled";
                logger.info("❌ Pagamento cancelado");
                break;
            case "PAYMENT_REFUNDED":
                newStatus = "refunded";
                logger.info("↩️ Pagamento estornado");
                break;
            default:
                logger.info(`ℹ️ Evento não tratado: ${event}`);
                res.status(200).send("Event ignored");
                return;
        }

        // 4. Buscar pedido no Firestore pelo asaasId
        const db = getDb();
        const ordersRef = db.collection("orders");
        const querySnapshot = await ordersRef
            .where("payment.asaasId", "==", paymentId)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            logger.warn(`⚠️ Pedido não encontrado para payment ID: ${paymentId}`);
            res.status(404).send("Order not found");
            return;
        }

        // 5. Atualizar status do pedido
        const orderDoc = querySnapshot.docs[0];
        await orderDoc.ref.update({
            status: newStatus,
            paymentStatus: event,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastWebhookEvent: {
                event,
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentData: body.payment
            }
        });

        logger.info(`✅ Pedido ${orderDoc.id} atualizado para status: ${newStatus}`);

        // 6. Se pagamento confirmado, atualizar reservas vinculadas
        if (newStatus === "payment_confirmed" || newStatus === "payment_received") {
            const orderData = orderDoc.data();
            if (orderData.items) {
                const reservasRef = db.collection("reservas");
                const reservasSnapshot = await reservasRef
                    .where("orderId", "==", orderDoc.id)
                    .get();

                const updatePromises = reservasSnapshot.docs.map(doc =>
                    doc.ref.update({
                        status: "confirmed",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    })
                );

                await Promise.all(updatePromises);
                logger.info(`✅ ${reservasSnapshot.size} reserva(s) confirmada(s)`);
            }
        }

        res.status(200).send({
            success: true,
            orderId: orderDoc.id,
            newStatus
        });

    } catch (error) {
        logger.error("❌ Erro ao processar webhook:", error);
        res.status(500).send({
            error: "Internal server error",
            message: String(error)
        });
    }
});
