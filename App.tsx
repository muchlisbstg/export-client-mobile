import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createInquiry, getProducts, trackInquiry, type InquiryStatus, type Product } from "./src/api";
import { catalogSortOptions, filterProducts, getCategories, sortProducts, type CatalogSortDirection, type CatalogSortField } from "./src/catalog-filter";
import { validateInquiryField, validateInquiryForm, type InquiryField, type InquiryFieldErrors } from "./src/rfq-validation";

const colors = { ink: "#17352c", green: "#194b3c", sage: "#78904a", muted: "#748078", line: "#dfe5de", paper: "#f6f7f3", white: "#ffffff", lime: "#c9d96d", danger: "#a33131" };

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function Field({ label, value, onChangeText, placeholder, error, keyboardType = "default", autoCapitalize = "sentences" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ? `Kesalahan: ${error}` : undefined}
        style={[styles.input, error ? { borderColor: colors.danger } : undefined]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98a29b"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 5 }} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return <View style={styles.sectionTitle}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.sectionHeading}>{children}</Text></View>;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [quantity, setQuantity] = useState("1000");
  const [fieldErrors, setFieldErrors] = useState<InquiryFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState(false);
  const trackingLock = useRef(false);
  const [error, setError] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [trackedInquiry, setTrackedInquiry] = useState<InquiryStatus | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogSortField, setCatalogSortField] = useState<CatalogSortField>("default");
  const [catalogSortDirection, setCatalogSortDirection] = useState<CatalogSortDirection>("asc");
  const catalogSearchRef = useRef<TextInput>(null);

  async function loadProducts() {
    setLoading(true);
    setCatalogError("");
    setError("");
    try {
      const data = await getProducts();
      setProducts(data);
      setSelectedProduct((current) => current || data[0]?.id || "");
    } catch (caught) {
      setCatalogError(caught instanceof Error ? caught.message : "Katalog belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const categories = getCategories(products);
  const visibleProducts = sortProducts(filterProducts(products, catalogQuery, catalogCategory), catalogSortField, catalogSortDirection);
  const catalogFilterActive = catalogQuery.trim().length > 0 || catalogCategory.length > 0;
  const selectedProductRecord = products.find((product) => product.id === selectedProduct);
  const selectedProductHidden = Boolean(selectedProductRecord && !visibleProducts.some((product) => product.id === selectedProduct));

  function resetCatalogFilters() {
    setCatalogQuery("");
    setCatalogCategory("");
    catalogSearchRef.current?.focus();
  }

  function updateInquiryField(field: InquiryField, value: string) {
    switch (field) {
      case "customerName": setCustomerName(value); break;
      case "customerEmail": setCustomerEmail(value); break;
      case "destinationCountry": setDestinationCountry(value); break;
      case "productId": setSelectedProduct(value); break;
      case "quantity": setQuantity(value); break;
    }
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const message = validateInquiryField(field, value);
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  async function submit() {
    setError("");
    setTrackedInquiry(null);
    const fieldErrors = validateInquiryForm({ customerName, customerEmail, destinationCountry, productId: selectedProduct, quantity });
    setFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const numericQuantity = Number(quantity);

    setSubmitting(true);
    try {
      const result = await createInquiry({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        destinationCountry: destinationCountry.trim(),
        productId: selectedProduct,
        quantity: numericQuantity,
      });
      setTrackingCode(result.trackingCode);
      setTrackingInput(result.trackingCode);
      setCustomerName("");
      setCustomerEmail("");
      setDestinationCountry("");
      setFieldErrors({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Permintaan gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  async function lookup() {
    if (trackingLock.current) return;
    const code = trackingInput.trim();
    setError("");
    setTrackedInquiry(null);
    if (!code) {
      setError("Masukkan kode pelacakan.");
      return;
    }

    trackingLock.current = true;
    setTracking(true);
    try {
      setTrackedInquiry(await trackInquiry(code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status belum dapat dimuat.");
    } finally {
      trackingLock.current = false;
      setTracking(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandMark}><Text style={styles.brandInitial}>E</Text></View>
          <View style={styles.brandText}><Text style={styles.brandName}>ExportClient</Text><Text style={styles.brandCaption}>PORTAL KLIEN EKSPOR</Text></View>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>API</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>PERMINTAAN EKSPOR, LEBIH TERHUBUNG.</Text>
          <Text style={styles.heroTitle}>Satu permintaan.{"\n"}<Text style={styles.heroAccent}>Lintas perangkat.</Text></Text>
          <Text style={styles.heroCopy}>Katalog dan status tersimpan di backend lokal mobile. Peer sync opsional menghubungkan web dan desktop.</Text>
        </View>

        <View style={styles.card}>
          <SectionTitle eyebrow="01 — KATALOG">Produk pilihan</SectionTitle>
          {loading ? <ActivityIndicator color={colors.sage} style={styles.loader} /> : catalogError ? <View style={[styles.emptyFilter, { borderWidth: 1, borderColor: "#f0d1cc", backgroundColor: "#fff8f6" }]} accessibilityRole="alert">
            <Text style={[styles.emptyFilterTitle, { color: colors.danger }]}>Katalog tidak dapat dimuat</Text>
            <Text style={styles.emptyFilterCopy}>{catalogError}</Text>
            <Pressable onPress={() => void loadProducts()} style={[styles.emptyAction, { backgroundColor: colors.green, borderColor: colors.green }]} accessibilityRole="button"><Text style={[styles.emptyActionText, { color: colors.white }]}>Coba lagi</Text></Pressable>
          </View> : products.length === 0 ? <Text style={styles.mutedText}>Katalog belum tersedia.</Text> : <>
            <View style={styles.searchWrap}>
              <TextInput ref={catalogSearchRef} accessibilityLabel="Cari nama, kategori, atau asal" style={styles.searchInput} value={catalogQuery} onChangeText={setCatalogQuery} placeholder="Cari nama, kategori, atau asal" placeholderTextColor="#98a29b" autoCapitalize="none" autoCorrect={false} />
              {catalogQuery.length > 0 ? <Pressable onPress={() => setCatalogQuery("")} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Bersihkan pencarian"><Text style={styles.clearButtonText}>×</Text></Pressable> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.categoryChips} keyboardShouldPersistTaps="handled">
              <Pressable onPress={() => setCatalogCategory("")} style={[styles.categoryChip, !catalogCategory && styles.categoryChipSelected]} accessibilityRole="button" accessibilityState={{ selected: !catalogCategory }}><Text style={[styles.categoryChipText, !catalogCategory && styles.categoryChipTextSelected]}>Semua</Text></Pressable>
              {categories.map((category) => <Pressable key={category} onPress={() => setCatalogCategory(category)} style={[styles.categoryChip, catalogCategory === category && styles.categoryChipSelected]} accessibilityRole="button" accessibilityState={{ selected: catalogCategory === category }}><Text style={[styles.categoryChipText, catalogCategory === category && styles.categoryChipTextSelected]}>{category}</Text></Pressable>)}
            </ScrollView>
            <Text style={styles.label}>Urutkan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.categoryChips} keyboardShouldPersistTaps="handled" accessibilityLabel="Urutkan produk">
              {catalogSortOptions.map(({ field, label }) => <Pressable key={field} onPress={() => { setCatalogSortField(field); setCatalogSortDirection("asc"); }} style={[styles.categoryChip, catalogSortField === field && styles.categoryChipSelected]} accessibilityRole="button" accessibilityLabel={`Urutkan berdasarkan ${label}`} accessibilityState={{ selected: catalogSortField === field }}><Text style={[styles.categoryChipText, catalogSortField === field && styles.categoryChipTextSelected]}>{label}</Text></Pressable>)}
              {catalogSortField !== "default" ? <Pressable onPress={() => setCatalogSortDirection((direction) => direction === "asc" ? "desc" : "asc")} style={[styles.categoryChip, catalogSortDirection === "desc" && styles.categoryChipSelected]} accessibilityRole="button" accessibilityLabel={`Urutan ${catalogSortDirection === "asc" ? "A sampai Z" : "Z sampai A"}; ubah ke ${catalogSortDirection === "asc" ? "Z sampai A" : "A sampai Z"}`} accessibilityState={{ selected: catalogSortDirection === "desc" }}><Text style={[styles.categoryChipText, catalogSortDirection === "desc" && styles.categoryChipTextSelected]}>{catalogSortDirection === "asc" ? "A–Z" : "Z–A"}</Text></Pressable> : null}
            </ScrollView>
            <View style={styles.resultHeader}><Text style={styles.resultCount} accessibilityRole="text" accessibilityLiveRegion="polite">{visibleProducts.length} dari {products.length} produk</Text>{catalogFilterActive ? <Pressable onPress={resetCatalogFilters} accessibilityRole="button"><Text style={styles.resetText}>Reset filter</Text></Pressable> : null}</View>
            {selectedProductHidden ? <View style={styles.selectedHidden}><Text style={styles.selectedHiddenText}>Terpilih: {selectedProductRecord?.name}</Text><Pressable onPress={resetCatalogFilters} accessibilityRole="button"><Text style={styles.showSelectedText}>Tampilkan pilihan</Text></Pressable></View> : null}
            {visibleProducts.length === 0 ? <View style={styles.emptyFilter}><Text style={styles.emptyFilterTitle}>Tidak ada produk yang cocok</Text><Text style={styles.emptyFilterCopy}>Coba ubah kata pencarian atau kategori.</Text><Pressable onPress={resetCatalogFilters} accessibilityRole="button" style={styles.emptyAction}><Text style={styles.emptyActionText}>Hapus filter</Text></Pressable></View> : visibleProducts.map((product) => {
              const index = products.findIndex((item) => item.id === product.id);
              return <Pressable key={product.id} onPress={() => updateInquiryField("productId", product.id)} style={[styles.productRow, selectedProduct === product.id && styles.productSelected]} accessibilityRole="radio" accessibilityState={{ selected: selectedProduct === product.id }} accessibilityHint={fieldErrors.productId ? "Pilih produk untuk menghapus kesalahan." : undefined}>
                <View style={[styles.productIcon, index === 1 && styles.productIconAlt, index === 2 && styles.productIconThird]}><Text style={styles.productIconText}>{String(index + 1).padStart(2, "0")}</Text></View>
                <View style={styles.productCopy}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{product.category} · {product.origin} · per {product.unit}</Text></View>
                <View style={[styles.radio, selectedProduct === product.id && styles.radioSelected]}>{selectedProduct === product.id && <View style={styles.radioInner} />}</View>
              </Pressable>;
            })}
          </>}
          {fieldErrors.productId ? <Text style={{ color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 5 }} accessibilityRole="alert" accessibilityLiveRegion="polite">{fieldErrors.productId}</Text> : null}
          <Text style={styles.demoNote}>Katalog contoh untuk pengembangan awal.</Text>
        </View>

        <View style={styles.card}>
          <SectionTitle eyebrow="02 — RFQ">Ajukan penawaran</SectionTitle>
          <Text style={styles.cardIntro}>Data tersimpan di SQLite lokal. Jika peer sync dikonfigurasi, kode ini dapat dilacak dari web atau desktop.</Text>
          <Field label="Nama lengkap" value={customerName} onChangeText={(value) => updateInquiryField("customerName", value)} placeholder="Nama Anda" error={fieldErrors.customerName} />
          <Field label="Email kerja" value={customerEmail} onChangeText={(value) => updateInquiryField("customerEmail", value)} placeholder="nama@perusahaan.com" error={fieldErrors.customerEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Negara tujuan" value={destinationCountry} onChangeText={(value) => updateInquiryField("destinationCountry", value)} placeholder="Contoh: Jepang" error={fieldErrors.destinationCountry} />
          <Field label="Jumlah (kg)" value={quantity} onChangeText={(value) => updateInquiryField("quantity", value)} placeholder="1000" error={fieldErrors.quantity} keyboardType="decimal-pad" />
          <Pressable style={[styles.primaryButton, (submitting || loading || products.length === 0) && styles.disabledButton]} onPress={() => void submit()} disabled={submitting || loading || products.length === 0} accessibilityRole="button">
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Kirim permintaan <Text style={styles.buttonArrow}>↗</Text></Text>}
          </Pressable>
          {trackingCode ? <View style={styles.successBox}><Text style={styles.successTitle}>Permintaan tersimpan</Text><Text style={styles.successCopy}>Simpan kode ini untuk melacak permintaan dari perangkat mana pun.</Text><Text selectable style={styles.code}>{trackingCode}</Text></View> : null}
        </View>

        <View style={[styles.card, styles.trackCard]}>
          <SectionTitle eyebrow="03 — STATUS">Lacak permintaan</SectionTitle>
          <Text style={styles.cardIntro}>Masukkan kode dari node web, mobile, atau desktop yang sudah tersinkron.</Text>
          <Field label="Kode pelacakan" value={trackingInput} onChangeText={setTrackingInput} placeholder="24 karakter" autoCapitalize="characters" />
          <Pressable
            style={[styles.secondaryButton, tracking && styles.disabledButton]}
            onPress={() => void lookup()}
            disabled={tracking}
            accessibilityRole="button"
            accessibilityLabel={tracking ? "Sedang memeriksa status" : "Periksa status"}
            accessibilityState={{ disabled: tracking }}
          >
            {tracking ? <ActivityIndicator color={colors.green} /> : <Text style={styles.secondaryButtonText}>Periksa status <Text style={styles.buttonArrow}>→</Text></Text>}
          </Pressable>
          {trackedInquiry ? <View style={styles.statusBox}><View style={styles.liveDot} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>{trackedInquiry.status === "received" ? "Diterima" : trackedInquiry.status}</Text><Text style={styles.statusMeta}>{trackedInquiry.productName} · {new Date(trackedInquiry.createdAt).toLocaleString("id-ID")}</Text></View></View> : null}
          <Text style={styles.privacyNote}>Kode pelacakan bersifat privat. Jangan bagikan kepada orang lain.</Text>
        </View>

        {error ? <Text style={styles.errorBox} accessibilityRole="alert">{error}</Text> : null}
        <Text style={styles.footer}>ExportClient · MVP · data demo, belum untuk transaksi</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingBottom: 34, maxWidth: 680, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", marginRight: 10 },
  brandInitial: { color: colors.white, fontSize: 17, fontWeight: "800" },
  brandText: { flex: 1 }, brandName: { color: colors.ink, fontSize: 16, fontWeight: "800", letterSpacing: -0.6 }, brandCaption: { color: colors.muted, fontSize: 8, letterSpacing: 1.3, marginTop: 3 },
  liveBadge: { borderWidth: 1, borderColor: colors.line, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 7 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#92b958" }, liveText: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  hero: { paddingTop: 34, paddingBottom: 26 }, heroKicker: { color: colors.sage, fontSize: 9, fontWeight: "800", letterSpacing: 1.5, marginBottom: 13 }, heroTitle: { color: colors.ink, fontSize: 36, lineHeight: 42, fontWeight: "600", letterSpacing: -1.9 }, heroAccent: { color: colors.sage }, heroCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 13, maxWidth: 380 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#e8ece5", padding: 18, marginBottom: 14 }, sectionTitle: { marginBottom: 14 }, eyebrow: { color: colors.sage, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 7 }, sectionHeading: { color: colors.ink, fontSize: 21, fontWeight: "700", letterSpacing: -0.7 },
  loader: { paddingVertical: 20 }, mutedText: { color: colors.muted, fontSize: 12 }, searchWrap: { position: "relative", justifyContent: "center", marginBottom: 10 }, searchInput: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 11, paddingRight: 40, color: colors.ink, backgroundColor: colors.white, fontSize: 12 }, clearButton: { position: "absolute", right: 8, width: 30, height: 30, alignItems: "center", justifyContent: "center" }, clearButtonText: { color: colors.muted, fontSize: 23, lineHeight: 25 }, categoryChips: { gap: 7, paddingBottom: 11, paddingRight: 14 }, categoryChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.white }, categoryChipSelected: { backgroundColor: colors.green, borderColor: colors.green }, categoryChipText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, categoryChipTextSelected: { color: colors.white }, resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, resultCount: { color: colors.muted, fontSize: 10, fontWeight: "700" }, resetText: { color: colors.green, fontSize: 10, fontWeight: "800" }, selectedHidden: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#f3f6ed", borderLeftWidth: 3, borderLeftColor: colors.sage, padding: 10, marginVertical: 8 }, selectedHiddenText: { color: colors.ink, fontSize: 10, flex: 1 }, showSelectedText: { color: colors.green, fontSize: 10, fontWeight: "800" }, emptyFilter: { alignItems: "center", paddingVertical: 22, paddingHorizontal: 8 }, emptyFilterTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, emptyFilterCopy: { color: colors.muted, fontSize: 10, marginTop: 5 }, emptyAction: { marginTop: 12, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: colors.green, borderRadius: 2 }, emptyActionText: { color: colors.green, fontSize: 10, fontWeight: "800" }, productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 9, borderWidth: 1, borderColor: "transparent", borderRadius: 3, marginHorizontal: -9 }, productSelected: { backgroundColor: "#f3f6ed", borderColor: "#cbd8bc" }, productIcon: { width: 42, height: 42, borderRadius: 3, alignItems: "center", justifyContent: "center", backgroundColor: "#87956f" }, productIconAlt: { backgroundColor: "#8d9062" }, productIconThird: { backgroundColor: "#947653" }, productIconText: { color: colors.white, fontSize: 11, fontWeight: "700", letterSpacing: 1 }, productCopy: { flex: 1 }, productName: { color: colors.ink, fontSize: 12, fontWeight: "700" }, productMeta: { color: colors.muted, fontSize: 9, marginTop: 4 }, radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: "#b6c0b7", alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: colors.green }, radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green }, demoNote: { color: "#89938d", fontSize: 9, marginTop: 9 },
  cardIntro: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: -3, marginBottom: 15 }, field: { marginBottom: 13 }, label: { color: "#40564c", fontSize: 10, fontWeight: "700", marginBottom: 6 }, input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 11, paddingVertical: 10, color: colors.ink, backgroundColor: colors.white, fontSize: 12 }, primaryButton: { minHeight: 46, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", marginTop: 3, borderRadius: 2 }, primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "700", width: "100%", paddingHorizontal: 14 }, buttonArrow: { fontSize: 17 }, disabledButton: { opacity: 0.55 }, successBox: { backgroundColor: "#edf2e4", borderLeftWidth: 3, borderLeftColor: "#85a456", padding: 12, marginTop: 13 }, successTitle: { color: "#435644", fontSize: 11, fontWeight: "700" }, successCopy: { color: "#647669", fontSize: 10, lineHeight: 15, marginTop: 4 }, code: { color: colors.green, fontSize: 14, fontWeight: "800", letterSpacing: 1.2, marginTop: 8 },
  trackCard: { backgroundColor: "#f1f3eb" }, secondaryButton: { minHeight: 43, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", borderRadius: 2 }, secondaryButtonText: { color: colors.green, fontSize: 11, fontWeight: "800" }, statusBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, marginTop: 12, backgroundColor: "#e8efdf" }, statusCopy: { flex: 1 }, statusTitle: { color: colors.green, fontSize: 11, fontWeight: "800", textTransform: "capitalize" }, statusMeta: { color: colors.muted, fontSize: 9, marginTop: 4 }, privacyNote: { color: "#858f88", fontSize: 9, lineHeight: 14, marginTop: 14 }, errorBox: { color: colors.danger, backgroundColor: "#fff0ee", borderWidth: 1, borderColor: "#f0d1cc", padding: 12, marginBottom: 13, fontSize: 11, lineHeight: 16 }, footer: { color: "#8b968f", fontSize: 9, textAlign: "center", marginTop: 7 }
});
