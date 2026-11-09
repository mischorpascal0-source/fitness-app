const { createReadStream, createWriteStream } = require("node:fs");
const { once } = require("node:events");
const { createGunzip } = require("node:zlib");
const { normalize } = require("../food-code.js");

const country = /(?:^|,)en:(?:germany|deutschland)(?:,|$)/;
const outputFields = "barcode,name,brand,quantity,unit,kcal,protein,carbs,fat,updated_at";
const fields = ["code", "product_name", "brands", "quantity", "countries_tags", "states_tags",
  "energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g", "last_updated_t"];

function clean(value, length) {
  return value.replace(/\p{Cc}+/gu, " ").trim().slice(0, length).toWellFormed();
}

function numberOrNull(value, max) {
  const number = Number(value);
  return value.trim() && number >= 0 && number <= max ? String(number) : "";
}

function csvText(value) {
  return '"' + value.replaceAll('"', '""') + '"';
}

async function prepare(source, target) {
  const gzip = createReadStream(source);
  const stream = gzip.pipe(createGunzip()).setEncoding("utf8");
  gzip.on("error", (error) => stream.destroy(error));
  const products = new Map();
  let header;
  let rows = 0;
  let malformed = 0;
  let remainder = "";

  function readRow(line) {
    if (!header) {
      const columns = line.split("\t");
      const positions = fields.map((key) => columns.indexOf(key));
      if (positions.includes(-1)) throw new Error("Unexpected Open Food Facts export columns");
      header = { count: columns.length, positions };
      return;
    }
    rows++;
    if (!line.includes("en:germany") && !line.includes("en:deutschland")) return;
    const columns = line.split("\t");
    if (columns.length !== header.count) {
      malformed++;
      return;
    }
    const [code, label, brand, size, countries, states, kcal, protein, carbs, fat, updated] = header.positions.map((i) => columns[i]);
    if (!country.test(countries) || states.split(",").includes("en:obsolete")) return;
    const barcode = normalize(code);
    const name = clean(label, 200);
    if (!barcode || !name) return;
    // Prefix before converting so equal numbers with different lengths stay distinct.
    const key = Number("1" + barcode);
    const timestamp = /^\d{1,12}$/.test(updated) ? Number(updated) : 0;
    if (products.has(key) && products.get(key).timestamp >= timestamp) return;
    const quantity = clean(size, 100);
    const unit = /\d\s*(?:ml|cl|dl|l)\b/iu.test(quantity) ? "ml" : "g";
    const values = [csvText(barcode), csvText(name), csvText(clean(brand, 200)), csvText(quantity), unit,
      numberOrNull(kcal, 2000), numberOrNull(protein, 200), numberOrNull(carbs, 200), numberOrNull(fat, 200), timestamp || ""];
    products.set(key, { timestamp, row: values.join(",") + "\n" });
  }

  for await (const chunk of stream) {
    const lines = (remainder + chunk).split("\n");
    remainder = lines.pop();
    for (const line of lines) readRow(line.replace(/\r$/, ""));
  }
  if (remainder) readRow(remainder);
  if (!products.size) throw new Error("No German products in the export");
  const output = createWriteStream(target, { encoding: "utf8" });
  output.write(outputFields + "\n");
  for (const key of Array.from(products.keys()).sort((a, b) => a - b)) {
    if (!output.write(products.get(key).row)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  console.log(`${products.size} products from ${rows} export rows (${malformed} candidate rows with unexpected column count).`);
}

const [source, target] = process.argv.slice(2);
if (!source || !target) throw new Error("Usage: node scripts/prepare-food-catalog.cjs <export.tsv.gz> <catalog.csv>");
prepare(source, target).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
