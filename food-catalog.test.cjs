const assert = require("node:assert/strict");
const { test } = require("node:test");
const { foodCatalog } = require("./food-catalog.cjs");
const { normalize } = require("./food-code.js");

test("normalizes the same barcode from EAN, UPC and product QR formats", () => {
  assert.equal(normalize("4337185761638"), "4337185761638");
  assert.equal(normalize("123456789012"), "0123456789012");
  assert.equal(normalize("https://example.com/01/04337185761638/10/batch"), "4337185761638");
  assert.equal(normalize("(01)04337185761638(10)batch"), "4337185761638");
  assert.equal(normalize("https://de.openfoodfacts.org/product/4337185761638/skyr"), "4337185761638");
  assert.equal(normalize("https://example.com/products/4337185761638"), null);
});

test("looks up the account barcode and the imported catalog before calling Open Food Facts", async () => {
  const product = { barcode: "4337185761638", name: "Skyr natur" };
  const paths = [];
  const local = await foodCatalog({ action: "barcode", barcode: product.barcode }, async (path) => {
    paths.push(path);
    return path.includes("/fitness_food_catalog?") ? [product] : [];
  }, () => assert.fail("The catalog product should be served locally."));
  assert.match(paths[0], /\/fitness_own_foods\?/);
  assert.deepEqual(local, { product: { ...product, source: "off" } });
  const saved = await foodCatalog({ action: "barcode", barcode: product.barcode }, async (path) => {
    assert.match(path, /\/fitness_own_foods\?/);
    return [product];
  }, () => assert.fail("An account product should be served locally."));
  assert.equal(saved.product.source, "own");
});

test("distinguishes a missing barcode from an unavailable source and keeps zero separate from missing values", async () => {
  const request = { action: "barcode", barcode: "4337185761638" };
  const noLocalProducts = async () => [];
  assert.deepEqual(await foodCatalog(request, noLocalProducts, async () => ({ status: 404 })), { product: null });
  assert.deepEqual(await foodCatalog(request, noLocalProducts, async () => ({ status: 503, ok: false })), { product: null, unavailable: true });
  const product = await foodCatalog(request, noLocalProducts, async () => ({
    ok: true,
    json: async () => ({
      product: {
        product_name_de: "Fruchtgetränk",
        product_quantity_unit: "ml",
        nutrition: { aggregated_set: { preparation: "as_sold", per: "100g", nutrients: {
          "energy-kcal": { value_computed: 22 }, fat: { value: 0 },
        } } },
      },
    }),
  }));
  assert.equal(product.product.unit, "ml");
  assert.equal(product.product.kcal, 22);
  assert.equal(product.product.fat, 0);
  assert.equal(product.product.protein, null);
});

test("saves a missing barcode without accepting a client-supplied owner", async () => {
  const product = { barcode: "4337185761638", name: "Mein Skyr", unit: "g", kcal: 63, protein: 11, carbs: 4, fat: 0 };
  const saved = await foodCatalog({ action: "save", ...product, owner_id: "another-account" }, async (path, options) => {
    assert.match(path, /\/fitness_own_foods\?on_conflict=owner_id%2Cbarcode/);
    assert.deepEqual(options.data, product);
    return [product];
  });
  assert.deepEqual(saved, { product: { ...product, source: "own" } });
  await assert.rejects(foodCatalog({ action: "save", ...product, fat: null }, () => assert.fail("Invalid entry")), { status: 400 });
});
