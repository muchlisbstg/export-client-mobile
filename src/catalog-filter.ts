import type { Product } from "./api-core";

/** Normalize user/catalog text for case-, accent-, and edge-space-insensitive matching. */
export function normalizeCatalogText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id-ID")
    .trim();
}

export type CatalogSortField = "default" | "name" | "category" | "origin" | "unit";
export type CatalogSortDirection = "asc" | "desc";

export const catalogSortOptions: ReadonlyArray<{ field: CatalogSortField; label: string }> = [
  { field: "default", label: "Urutan awal" },
  { field: "name", label: "Nama" },
  { field: "category", label: "Kategori" },
  { field: "origin", label: "Asal" },
  { field: "unit", label: "Satuan" },
];

export type ActiveCatalogFilter = { key: "search" | "category" | "origin"; value: string };

/** Describe active filters in a stable order for the removable filter summary. */
export function getActiveCatalogFilters(query: string, category: string, origin: string): ActiveCatalogFilter[] {
  const filters: ActiveCatalogFilter[] = [];
  const trimmedQuery = query.trim();
  if (trimmedQuery) filters.push({ key: "search", value: trimmedQuery });
  if (category) filters.push({ key: "category", value: category });
  if (origin) filters.push({ key: "origin", value: origin });
  return filters;
}

/** Return non-empty categories actually present in the received catalog, sorted for Indonesia. */
export function getCategories(products: readonly Product[]): string[] {
  const categories = new Set(products.map((product) => product.category).filter(Boolean));
  return [...categories].sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }));
}

export function getOrigins(products: readonly Product[]): string[] {
  const origins = new Set(products.map((product) => product.origin).filter(Boolean));
  return [...origins].sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }));
}

export type CatalogFacetField = "category" | "origin";

/** Count non-empty facet values in the supplied, already-filtered catalog subset. */
export function getFacetCounts<T extends Pick<Product, CatalogFacetField>>(
  products: readonly T[],
  field: CatalogFacetField,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = product[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Filter without mutating the fetched catalog; text, category, and origin are combined with AND. */
export function filterProducts(products: readonly Product[], query = "", category = "", origin = ""): Product[] {
  const normalizedQuery = normalizeCatalogText(query);
  return products.filter((product) => {
    const matchesQuery = !normalizedQuery || normalizeCatalogText(`${product.name} ${product.category} ${product.origin}`).includes(normalizedQuery);
    const matchesCategory = !category || product.category === category;
    const matchesOrigin = !origin || product.origin === origin;
    return matchesQuery && matchesCategory && matchesOrigin;
  });
}

/** Sort a copy of the currently loaded catalog; equal values retain their input order. */
export function sortProducts<T extends Product>(
  products: readonly T[],
  field: CatalogSortField = "default",
  direction: CatalogSortDirection = "asc",
): T[] {
  if (field === "default") return [...products];

  const collator = new Intl.Collator("id-ID", { sensitivity: "base", numeric: true });
  const multiplier = direction === "asc" ? 1 : -1;
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const result = collator.compare(String(a.product[field] ?? "").trim(), String(b.product[field] ?? "").trim());
      return result === 0 ? a.index - b.index : result * multiplier;
    })
    .map(({ product }) => product);
}
