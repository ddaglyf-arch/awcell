import axios, { AxiosError } from "axios";
import config from "../config";
import supabase from "../database";
import { MercadoPagoPreference, MercadoPagoPayment, PaymentStatus } from "../types";
import { updateOrderPaymentStatus } from "./orderService";

const MP_API_URL = "https://api.mercadopago.com/v1";

export async function createPixPayment(
  orderId: string,
  userId: string,
  amountInReais: number
) {
  try {
    const payerEmail = `telegram_${userId.replace(/[^a-zA-Z0-9]/g, "") || "user"}@example.com`;

    const response = await axios.post(
      `${MP_API_URL}/payments`,
      {
        transaction_amount: Number(amountInReais.toFixed(2)),
        description: `Pedido ${orderId.substring(0, 8)}`,
        payment_method_id: "pix",
        payer: { email: payerEmail },
        external_reference: orderId,
        notification_url: `${config.server.publicUrl}/webhooks/mercadopago`,
      },
      {
        headers: {
          Authorization: `Bearer ${config.mercadopago.accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": orderId,
        },
      }
    );

    const payment = response.data;
    const { error } = await supabase.from("payments").insert({
      order_id: orderId,
      mercado_pago_id: String(payment.id),
      status: PaymentStatus.PENDING,
      amount: Math.round(amountInReais * 100),
      payment_method: "pix",
    });

    if (error) throw error;

    return {
      id: payment.id,
      qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error creating PIX payment:", error.response?.data || error.message);
    } else {
      console.error("Error creating PIX payment:", error);
    }
    throw error;
  }
}

export async function createPaymentPreference(
  orderId: string,
  userId: string,
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>,
  totalAmount: number
) {
  const notificationUrl = `${config.server.publicUrl}/webhooks/mercadopago`;

  const preferenceData = {
    items: items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency_id: "BRL",
    })),
    payer: {
      email: `user_${userId}@telegram.local`,
    },
    external_reference: orderId,
    notification_url: notificationUrl,
    back_urls: {
      success: config.server.publicUrl,
      failure: config.server.publicUrl,
      pending: config.server.publicUrl,
    },
    auto_return: "approved",
  };

  try {
    const response = await axios.post(`${MP_API_URL}/checkout/preferences`, preferenceData, {
      headers: {
        Authorization: `Bearer ${config.mercadopago.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Store payment preference
    const { error } = await supabase.from("payments").insert({
      order_id: orderId,
      status: PaymentStatus.PENDING,
      amount: totalAmount,
      payment_method: "mercado_pago",
    });

    if (error) throw error;

    return {
      preference_id: response.data.id,
      init_point: response.data.init_point,
      sandbox_init_point: response.data.sandbox_init_point,
    };
  } catch (error) {
    console.error("Error creating Mercado Pago preference:", error);
    throw error;
  }
}

export async function getPaymentStatus(paymentId: string): Promise<MercadoPagoPayment | null> {
  try {
    const response = await axios.get(`${MP_API_URL}/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${config.mercadopago.accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error getting Mercado Pago payment status:", error);
    return null;
  }
}

export async function getPaymentByExternalReference(externalReference: string) {
  try {
    const response = await axios.get(
      `${MP_API_URL}/payments/search?external_reference=${externalReference}`,
      {
        headers: {
          Authorization: `Bearer ${config.mercadopago.accessToken}`,
        },
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    console.error("Error searching Mercado Pago payment:", error);
    return null;
  }
}

export async function processWebhookNotification(
  mpPaymentId: string,
  orderId: string,
  expectedAmount: number
) {
  try {
    // Get payment details from Mercado Pago
    const payment = await getPaymentStatus(mpPaymentId);

    if (!payment) {
      console.error("Payment not found in Mercado Pago");
      return null;
    }

    // Verify amount matches
    if (payment.transaction_amount !== expectedAmount / 100) {
      console.error("Payment amount mismatch");
      throw new Error("Payment amount validation failed");
    }

    // Verify external reference matches
    if (payment.external_reference !== orderId) {
      console.error("External reference mismatch");
      throw new Error("External reference validation failed");
    }

    // Determine payment status
    let paymentStatus: PaymentStatus;

    if (payment.status === "approved") {
      paymentStatus = PaymentStatus.APPROVED;
    } else if (payment.status === "pending") {
      paymentStatus = PaymentStatus.PENDING;
    } else if (payment.status === "rejected") {
      paymentStatus = PaymentStatus.REJECTED;
    } else if (payment.status === "cancelled") {
      paymentStatus = PaymentStatus.CANCELLED;
    } else {
      paymentStatus = PaymentStatus.PENDING;
    }

    // Update order payment status
    const updatedOrder = await updateOrderPaymentStatus(
      orderId,
      paymentStatus,
      mpPaymentId.toString()
    );

    // Update payment record
    const { error } = await supabase
      .from("payments")
      .update({
        mercado_pago_id: mpPaymentId,
        status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    if (error) throw error;

    return updatedOrder;
  } catch (error) {
    console.error("Error processing webhook notification:", error);
    throw error;
  }
}

export async function validateWebhookSignature(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  // Mercado Pago webhook signature validation
  // This is a simplified version - implement proper signature validation based on MP docs
  return true;
}

export async function refundPayment(mpPaymentId: string) {
  try {
    const response = await axios.post(
      `${MP_API_URL}/payments/${mpPaymentId}/refunds`,
      {},
      {
        headers: {
          Authorization: `Bearer ${config.mercadopago.accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error refunding Mercado Pago payment:", error);
    throw error;
  }
}
