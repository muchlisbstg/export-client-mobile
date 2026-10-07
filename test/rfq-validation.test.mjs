import assert from "node:assert/strict";
import test from "node:test";
import { validateInquiryField, validateInquiryForm } from "../src/rfq-validation.ts";

const validForm = {
  customerName: "Sari Export",
  customerEmail: "sari@example.co.id",
  destinationCountry: "Jepang",
  productId: "coffee-arabica",
  quantity: "1000",
};

test("accepts normalized contract boundaries and positive decimal quantities", () => {
  assert.deepEqual(validateInquiryForm({
    customerName: ` ${"N".repeat(120)} `,
    customerEmail: ` ${"a".repeat(242)}@example.co `,
    destinationCountry: ` ${"C".repeat(80)} `,
    productId: "P".repeat(80),
    quantity: "0.5",
  }), {});
});

test("returns accessible field messages for each invalid value", () => {
  const errors = validateInquiryForm({
    customerName: " ", customerEmail: "bad-email", destinationCountry: "X",
    productId: "", quantity: "0",
  });
  assert.deepEqual(Object.keys(errors), ["customerName", "customerEmail", "destinationCountry", "productId", "quantity"]);
  assert.equal(errors.customerName, "Nama wajib diisi minimal 2 karakter.");
  assert.equal(errors.customerEmail, "Masukkan alamat email yang valid.");
  assert.equal(errors.destinationCountry, "Negara tujuan wajib diisi minimal 2 karakter.");
  assert.equal(errors.productId, "Pilih produk.");
  assert.equal(errors.quantity, "Jumlah harus lebih dari 0.");
});

test("enforces field maxima and the same numeric upper bound as the API", () => {
  assert.equal(validateInquiryField("customerName", "N".repeat(121)), "Nama maksimal 120 karakter.");
  assert.equal(validateInquiryField("customerEmail", `${"a".repeat(244)}@example.co`), "Email maksimal 254 karakter.");
  assert.equal(validateInquiryField("destinationCountry", "C".repeat(81)), "Negara tujuan maksimal 80 karakter.");
  assert.equal(validateInquiryField("productId", "P".repeat(81)), "Pilihan produk tidak valid.");
  assert.equal(validateInquiryField("quantity", "1000001"), "Jumlah maksimal 1.000.000.");
});

test("rejects malformed email and non-finite numbers", () => {
  assert.notEqual(validateInquiryField("customerEmail", "a..b@example.com"), "");
  assert.notEqual(validateInquiryField("customerEmail", "a@example"), "");
  assert.notEqual(validateInquiryField("quantity", "Infinity"), "");
  assert.notEqual(validateInquiryField("quantity", ""), "");
});

test("accepts the API's existing RFQ property names", () => {
  assert.deepEqual(validateInquiryForm(validForm), {});
});
