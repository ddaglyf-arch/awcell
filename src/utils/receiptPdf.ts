function escapePdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/[\\()]/g, (character) => `\\${character}`);
}

function wrapText(value: string, maxLength: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxLength) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export function createPurchaseReceiptPdf(input: {
  orderId: string;
  customerName: string;
  customerTelegramId: number;
  createdAt: string;
  paymentMethod: string;
  total: number;
  deliveryToken: string;
  whatsapp: string;
  items: ReceiptItem[];
}): Buffer {
  const formatMoney = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  const date = new Date(input.createdAt).toLocaleString("pt-BR");
  const lines = [
    "AW CELL",
    "COMPROVANTE DE COMPRA",
    "========================================",
    `Pedido: #${input.orderId.substring(0, 8).toUpperCase()}`,
    `Cliente: ${input.customerName}`,
    `Telegram ID: ${input.customerTelegramId}`,
    `Data e hora: ${date}`,
    `Pagamento: ${input.paymentMethod}`,
    "----------------------------------------",
    "PRODUTOS",
  ];

  for (const item of input.items) {
    lines.push(...wrapText(item.name, 38));
    lines.push(`  ${item.quantity} x ${formatMoney(item.unitPrice)} = ${formatMoney(item.subtotal)}`);
  }

  lines.push(
    "----------------------------------------",
    `TOTAL: ${formatMoney(input.total)}`,
    "PAGAMENTO APROVADO",
    "----------------------------------------",
    `Token de entrega: ${input.deliveryToken}`,
    `WhatsApp: ${input.whatsapp}`,
    "Envie este token e o print do pagamento aprovado",
    "no WhatsApp para receber o produto.",
    "",
    "Obrigado pela compra!",
  );

  const pageWidth = 595;
  const pageHeight = 842;
  const content = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"];
  lines.forEach((line, index) => {
    if (index > 0) content.push("T*");
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push("ET");
  const pageContent = content.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(pageContent, "ascii")} >>\nstream\n${pageContent}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}
