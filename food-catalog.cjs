const { normalize } = require("./food-code.js");

const nutrientLimits = { kcal: 2000, protein: 200, carbs: 200, fat: 200 };
const nutrientNames = { kcal: "energy-kcal", protein: "proteins", carbs: "carbohydrates", fat: "fat" };

class FoodCatalogError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function nutrient(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}

function manualProduct(input, barcode) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const unit = input.unit;
  const values = Object.fromEntries(Object.entries(nutrientLimits).map(([key, limit]) => [key, nutrient(input[key], limit)]));
  if (!name || name.length > 100 || /\p{Cc}/u.test(name) || !["g", "ml"].includes(unit) || Object.values(values).includes(null)) {
    throw new FoodCatalogError(400, "Gib einen Namen, die Bezugseinheit und alle vier Nährwerte ein.");
  }
  return { barcode, name, unit, ...values };
}

async function lookupOpenFoodFacts(barcode, fetcher) {
  const url = new URL("https://world.openfoodfacts.org/api/v3.6/product/" + barcode);
  url.searchParams.set("fields", "product_name_de,product_name,brands,quantity,product_quantity_unit,nutrition");
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "FitnessApp/1.0 (https://github.com/mischorpascal0-source/fitness-app)" },
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 404) return { product: null };
    if (!response.ok) return { product: null, unavailable: true };
    const { product } = await response.json();
    const name = product?.product_name_de?.trim() || product?.product_name?.trim();
    if (!name) return { product: null };
    const set = product.nutrition?.aggregated_set;
    const unit = set?.per === "100ml" || ["ml", "cl", "dl", "l"].includes(product.product_quantity_unit?.toLowerCase()) ? "ml" : "g";
    const values = Object.fromEntries(Object.entries(nutrientNames).map(([field, key]) => {
      const value = set?.preparation === "as_sold" && ["100g", "100ml"].includes(set.per) ? set.nutrients?.[key] : undefined;
      return [field, nutrient(value?.value_computed ?? value?.value, nutrientLimits[field])];
    }));
    return { product: { barcode, name, brand: product.brands, quantity: product.quantity, unit, ...values, source: "off" } };
  } catch {
    return { product: null, unavailable: true };
  }
}

async function foodCatalog(input, query, fetcher = fetch) {
  if (input?.action === "search") {
    const term = typeof input.query === "string" ? input.query.trim() : "";
    if (term.length < 3 || term.length > 80) {
      throw new FoodCatalogError(400, "Gib für die Namenssuche 3 bis 80 Zeichen ein.");
    }
    return { products: await query("/rest/v1/rpc/fitness_food_search", { method: "POST", data: { p_query: term } }) };
  }
  if (!["barcode", "save"].includes(input?.action)) throw new FoodCatalogError(400, "Ungültige Lebensmittelanfrage.");
  const barcode = normalize(input.barcode);
  if (!barcode) throw new FoodCatalogError(400, "Gib einen gültigen Produktbarcode ein.");

  if (input.action === "save") {
    const [saved] = await query("/rest/v1/rpc/fitness_food_save", {
      method: "POST",
      data: { p_food: manualProduct(input, barcode), p_expected_shared: input.expectedShared === true },
    });
    if (!saved) throw new FoodCatalogError(502, "Das Lebensmittel konnte nicht gespeichert werden.");
    return { product: saved };
  }

  const [match] = await query("/rest/v1/rpc/fitness_food_barcode", { method: "POST", data: { p_barcode: barcode } });
  const { can_share: canShare, ...product } = match ?? {};
  if (product.barcode) return { product };
  const fallback = await lookupOpenFoodFacts(barcode, fetcher);
  return fallback.product ? fallback : { ...fallback, canShare: canShare === true };
}

module.exports = { foodCatalog, FoodCatalogError };
