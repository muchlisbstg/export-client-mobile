import assert from "node:assert/strict";
import test from "node:test";
import { filterProducts, getCategories, getFacetCounts, getOrigins, normalizeCatalogText, sortProducts } from "../src/catalog-filter.ts";
import { MAX_COMPARE_PRODUCTS, toggleCompareSelection } from "../src/catalog-compare.ts";

const products = [
  { id: "coffee", name: "Kopi Arabika", category: "Minuman", origin: "Jawa Barat", unit: "kg" },
  { id: "cocoa", name: "Kakao Fermentasi", category: "Bahan Baku", origin: "Sulawesi", unit: "kg" },
  { id: "tea", name: "Teh Hijau", category: "Minuman", origin: "Sumatera", unit: "kg" },
  { id: "spice", name: "Lada", category: "Rempah", origin: "Maluku", unit: "kg" },
];

test("search matches name, category, and origin", () => {
  assert.deepEqual(filterProducts(products, "arabika").map((p) => p.id), ["coffee"]);
  assert.deepEqual(filterProducts(products, "bahan baku").map((p) => p.id), ["cocoa"]);
  assert.deepEqual(filterProducts(products, "sumatera").map((p) => p.id), ["tea"]);
});

test("search ignores case, accents, and edge whitespace", () => {
  assert.equal(normalizeCatalogText("  KOPÍ ARÁBIKA  "), "kopi arabika");
  assert.deepEqual(filterProducts(products, "  KOPI  ").map((p) => p.id), ["coffee"]);
  assert.deepEqual(filterProducts([{ ...products[0], origin: "Jàwà Barat" }], "jawa").map((p) => p.id), ["coffee"]);
});

test("categories are dynamic, unique, non-empty, and Indonesian-locale sorted", () => {
  const input = [{ ...products[0], category: "  Zeta " }, { ...products[1], category: "Álfa" }, { ...products[2], category: "zeta" }, { ...products[3], category: "" }];
  assert.deepEqual(getCategories(input), ["  Zeta ", "Álfa", "zeta"]);
});

test("origins are dynamic, unique, non-empty, and Indonesian-locale sorted", () => {
  const input = [...products, { ...products[0], id: "coffee-2" }, { ...products[0], id: "coffee-3", origin: "Bali" }];
  assert.deepEqual(getOrigins(input), ["Bali", "Jawa Barat", "Maluku", "Sulawesi", "Sumatera"]);
});

test("facet counts reflect the other active filter", () => {
  const categoriesForWestJava = getFacetCounts(filterProducts(products, "", "", "Jawa Barat"), "category");
  assert.deepEqual([...categoriesForWestJava], [["Minuman", 1]]);
  const originsForDrinks = getFacetCounts(filterProducts(products, "", "Minuman"), "origin");
  assert.deepEqual([...originsForDrinks], [["Jawa Barat", 1], ["Sumatera", 1]]);
});

test("distinct API category values, including a category named all, remain filterable", () => {
  const catalog = [
    { ...products[0], id: "accented", category: "Café" },
    { ...products[1], id: "plain", category: "Cafe" },
    { ...products[2], id: "literal-all", category: "all" },
  ];
  assert.deepEqual(getCategories(catalog).length, 3);
  assert.deepEqual(filterProducts(catalog, "", "Café").map((p) => p.id), ["accented"]);
  assert.deepEqual(filterProducts(catalog, "", "all").map((p) => p.id), ["literal-all"]);
});

test("category and query filters use AND semantics", () => {
  assert.deepEqual(filterProducts(products, "teh", "Minuman").map((p) => p.id), ["tea"]);
  assert.deepEqual(filterProducts(products, "teh", "Rempah"), []);
});

test("query, category, and origin filters use AND semantics", () => {
  assert.deepEqual(filterProducts(products, "kopi", "Minuman", "Jawa Barat").map((p) => p.id), ["coffee"]);
  assert.deepEqual(filterProducts(products, "kopi", "Minuman", "Sumatera"), []);
});

test("empty result is distinct and source input remains immutable", () => {
  const original = products.slice();
  assert.deepEqual(filterProducts(products, "does-not-exist"), []);
  assert.deepEqual(products, original);
  assert.notStrictEqual(filterProducts(products, "kopi"), products);
});

test("clearing filters reveals the selected product without changing its id", () => {
  const selectedProduct = "coffee";
  const hidden = filterProducts(products, "teh", "Minuman");
  assert.equal(hidden.some((p) => p.id === selectedProduct), false);
  const shown = filterProducts(products, "", "");
  assert.equal(shown.some((p) => p.id === selectedProduct), true);
  assert.equal(selectedProduct, "coffee");
});

const sortableProducts = [
  { id: "zulu", name: "Zebra", category: "Rempah", origin: "Zambia", unit: "kg" },
  { id: "name-two-a", name: "Produk 2", category: "Minuman", origin: "Bali", unit: "bag" },
  { id: "name-two-b", name: "Produk 2", category: "Minuman", origin: "Bali", unit: "box" },
  { id: "name-ten", name: "Produk 10", category: "Bahan", origin: "Jakarta", unit: "g" },
];

test("local sorting supports each existing catalog field with Indonesian natural ordering", () => {
  assert.deepEqual(sortProducts(sortableProducts, "name").map((p) => p.id), ["name-two-a", "name-two-b", "name-ten", "zulu"]);
  assert.deepEqual(sortProducts(sortableProducts, "category").map((p) => p.id), ["name-ten", "name-two-a", "name-two-b", "zulu"]);
  assert.deepEqual(sortProducts(sortableProducts, "origin").map((p) => p.id), ["name-two-a", "name-two-b", "name-ten", "zulu"]);
  assert.deepEqual(sortProducts(sortableProducts, "unit").map((p) => p.id), ["name-two-a", "name-two-b", "name-ten", "zulu"]);
});

test("descending sorting is stable for ties and sorting a filtered list leaves source order unchanged", () => {
  const originalOrder = sortableProducts.map((p) => p.id);
  const descending = sortProducts(sortableProducts, "name", "desc");
  assert.deepEqual(descending.map((p) => p.id), ["zulu", "name-ten", "name-two-a", "name-two-b"]);
  const filteredSorted = sortProducts(filterProducts(sortableProducts, "produk"), "name", "desc");
  assert.deepEqual(filteredSorted.map((p) => p.id), ["name-ten", "name-two-a", "name-two-b"]);
  assert.deepEqual(sortProducts(sortableProducts, "default").map((p) => p.id), originalOrder);
  assert.notStrictEqual(sortProducts(sortableProducts, "default"), sortableProducts);
  assert.deepEqual(sortableProducts.map((p) => p.id), originalOrder);
});

test("comparison selection adds and removes products without mutating its source", () => {
  const selected = ["coffee", "cocoa"];
  assert.deepEqual(toggleCompareSelection(selected, "tea"), ["coffee", "cocoa", "tea"]);
  assert.deepEqual(toggleCompareSelection(selected, "coffee"), ["cocoa"]);
  assert.deepEqual(selected, ["coffee", "cocoa"]);
});

test("comparison selection is capped at three products and drops duplicate ids", () => {
  assert.equal(MAX_COMPARE_PRODUCTS, 3);
  assert.deepEqual(toggleCompareSelection(["coffee", "cocoa", "tea"], "spice"), ["coffee", "cocoa", "tea"]);
  assert.deepEqual(toggleCompareSelection(["coffee", "coffee", ""], "tea"), ["coffee", "tea"]);
});
