// Comprobante de transferencia de ejemplo (SVG genérico, sin marcas reales) para los pagos sembrados.
import { paymentMethods, type PaymentMethod } from "../../config";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function receiptImage({ amount, reference, date, method }: { amount: number; reference: string; date: Date; method: PaymentMethod }) {
  const when = date.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
  <rect width="360" height="520" rx="18" fill="#ffffff"/>
  <rect width="360" height="96" rx="18" fill="#1f2937"/><rect y="78" width="360" height="18" fill="#1f2937"/>
  <text x="24" y="44" font-family="Arial" font-size="13" fill="#9ca3af">COMPROBANTE DE EJEMPLO</text>
  <text x="24" y="70" font-family="Arial" font-size="20" font-weight="700" fill="#fff">${paymentMethods[method].label}</text>
  <circle cx="180" cy="150" r="30" fill="#dcfce7"/><path d="M166 150l9 9 19-19" stroke="#16a34a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="180" y="212" text-anchor="middle" font-family="Arial" font-size="15" fill="#6b7280">Transferencia exitosa</text>
  <text x="180" y="250" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#111827">${cop(amount)}</text>
  <line x1="24" y1="282" x2="336" y2="282" stroke="#e5e7eb" stroke-dasharray="4 4"/>
  <text x="24" y="318" font-family="Arial" font-size="13" fill="#6b7280">Destino</text><text x="336" y="318" text-anchor="end" font-family="Arial" font-size="13" fill="#111827">ÉLITE PÁDEL S.A.S.</text>
  <text x="24" y="350" font-family="Arial" font-size="13" fill="#6b7280">Referencia</text><text x="336" y="350" text-anchor="end" font-family="Arial" font-size="13" fill="#111827">${reference}</text>
  <text x="24" y="382" font-family="Arial" font-size="13" fill="#6b7280">Fecha</text><text x="336" y="382" text-anchor="end" font-family="Arial" font-size="13" fill="#111827">${when}</text>
  <text x="180" y="470" text-anchor="middle" font-family="Arial" font-size="11" fill="#9ca3af">Documento ficticio generado para la demo</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
