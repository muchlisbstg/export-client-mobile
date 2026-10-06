import { Platform } from "react-native";

export type Product = {
  id: string;
  name: string;
  category: string;
  origin: string;
  unit: string;
};

export type InquiryStatus = {
  status: string;
  createdAt: string;
  productName: string;
};

const platformDefault = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://127.0.0.1:4000";
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || platformDefault).replace(/\/+$/, "");

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    if (response.status === 429) throw new Error("Batas permintaan tercapai. Coba lagi beberapa menit lagi.");
    if (response.status === 404 && payload.error === "inquiry_not_found") {
      throw new Error("Permintaan tidak ditemukan. Periksa kode pelacakan.");
    }
    if (response.status === 404 && payload.error === "product_not_found") {
      throw new Error("Produk ini sudah tidak tersedia.");
    }
    if (response.status === 400) throw new Error("Periksa kembali data yang dimasukkan.");
    throw new Error("API tidak dapat memproses permintaan. Pastikan server berjalan.");
  }
  return payload;
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/products`);
  const result = await readJson<{ data: Product[] }>(response);
  return result.data;
}

export async function createInquiry(input: {
  customerName: string;
  customerEmail: string;
  destinationCountry: string;
  productId: string;
  quantity: number;
}): Promise<{ trackingCode: string; status: string; createdAt: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson(response);
}

export async function trackInquiry(code: string): Promise<InquiryStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/inquiries/${encodeURIComponent(code.trim().toUpperCase())}`);
  const result = await readJson<{ data: InquiryStatus }>(response);
  return result.data;
}
