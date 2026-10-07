import type { Product } from "./api-core";

/** Normalize user/catalog text for case-, accent-, and edge-space-insensitive matching. */
export function normalizeCatalogText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id-ID")
    .trim();
}

/** Return non-empty categories actually present in the received catalog, sorted for Indonesia. */
export function getCategories(products: readonly Product[]): string[] {
  const categories = new Set(products.map((product) => product.category).filter(Boolean));
  return [...categories].sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }));
}

/** Filter without mutating the fetched catalog; text and category are combined with AND. */
export function filterProducts(products: readonly Product[], query = "", category = ""): Product[] {
  const normalizedQuery = normalizeCatalogText(query);
  return products.filter((product) => {
    const matchesQuery = !normalizedQuery || normalizeCatalogText(`${product.name} ${product.category} ${product.origin}`).includes(normalizedQuery);
    const matchesCategory = !category || product.category === category;
    return matchesQuery && matchesCategory;
  });
}
