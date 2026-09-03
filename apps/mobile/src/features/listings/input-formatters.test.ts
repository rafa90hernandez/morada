import assert from "node:assert/strict";
import test from "node:test";

import {
  brazilianCurrencyToCents,
  brazilianDateToIso,
  centsToBrazilianCurrency,
  formatBrazilianCurrencyInput,
  formatBrazilianDateInput,
  isoToBrazilianDate,
} from "./input-formatters";
import {
  irelandCitySuggestions,
  matchingSuggestions,
} from "./location-suggestions";

test("formats digits as a Brazilian date and converts it to ISO", () => {
  assert.equal(formatBrazilianDateInput("15092026"), "15/09/2026");
  assert.equal(brazilianDateToIso("15/09/2026"), "2026-09-15");
  assert.equal(isoToBrazilianDate("2026-09-15T00:00:00.000Z"), "15/09/2026");
});

test("rejects impossible Brazilian dates", () => {
  assert.equal(brazilianDateToIso("31/02/2026"), undefined);
  assert.equal(brazilianDateToIso("29/02/2025"), undefined);
  assert.equal(brazilianDateToIso("29/02/2024"), "2024-02-29");
});

test("formats whole-euro typing for pt-BR while preserving integer cents", () => {
  assert.equal(formatBrazilianCurrencyInput("1800"), "1.800,00");
  assert.equal(brazilianCurrencyToCents("1.800,00"), 180000);
  assert.equal(centsToBrazilianCurrency(180000), "1.800,00");
});

test("local autocomplete prioritizes prefix matches", () => {
  assert.deepEqual(matchingSuggestions("dub", irelandCitySuggestions), [
    "Dublin",
  ]);
});
