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

test("looks up all three catalog sources locally before calling Open Food Facts", async () => {
  for (const source of ["own", "shared", "off"]) {
    const product = { barcode: "4337185761638", name: "Skyr natur", source };
    const local = await foodCatalog({ action: "barcode", barcode: product.barcode }, async (path, options) => {
      assert.equal(path, "/rest/v1/rpc/fitness_food_barcode");
      assert.deepEqual(options, { method: "POST", data: { p_barcode: product.barcode } });
      return [{ ...product, can_share: false }];
    }, () => assert.fail("The catalog product should be served locally."));
    assert.deepEqual(local, { product });
  }
});

test("distinguishes a missing barcode from an unavailable source and keeps zero separate from missing values", async () => {
  const request = { action: "barcode", barcode: "4337185761638" };
  const noLocalProducts = async () => [];
  assert.deepEqual(await foodCatalog(request, noLocalProducts, async () => ({ status: 404 })), { product: null, canShare: false });
  const adminLookup = async () => [{ barcode: null, can_share: true }];
  assert.deepEqual(await foodCatalog(request, adminLookup, async () => ({ status: 503, ok: false })), { product: null, unavailable: true, canShare: true });
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

test("lets the database decide publication and never accepts a client-supplied owner or role", async () => {
  const product = { barcode: "4337185761638", name: "Mein Skyr", unit: "g", kcal: 63, protein: 11, carbs: 4, fat: 0 };
  const saved = await foodCatalog({ action: "save", ...product, owner_id: "another-account", role: "admin", source: "shared" }, async (path, options) => {
    assert.equal(path, "/rest/v1/rpc/fitness_food_save");
    assert.deepEqual(options.data, { p_food: product, p_expected_shared: false });
    return [{ ...product, source: "own" }];
  });
  assert.deepEqual(saved, { product: { ...product, source: "own" } });
  const shared = await foodCatalog({ action: "save", ...product, expectedShared: true }, async (path, options) => {
    assert.equal(path, "/rest/v1/rpc/fitness_food_save");
    assert.deepEqual(options.data, { p_food: product, p_expected_shared: true });
    return [{ ...product, source: "shared" }];
  });
  assert.deepEqual(shared, { product: { ...product, source: "shared" } });
  await assert.rejects(foodCatalog({ action: "save", ...product, fat: null }, () => assert.fail("Invalid entry")), { status: 400 });
});
