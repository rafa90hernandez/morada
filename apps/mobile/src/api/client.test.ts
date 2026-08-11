import assert from "node:assert/strict";
import test from "node:test";

import { buildQuery } from "./client";

test("buildQuery omits undefined values and encodes filters", () => {
  assert.equal(
    buildQuery({
      city: "Dublin 8",
      furnished: true,
      maxPriceCents: 100000,
      area: undefined,
    }),
    "?city=Dublin%208&furnished=true&maxPriceCents=100000",
  );
});

test("buildQuery returns an empty string when no query parameters exist", () => {
  assert.equal(buildQuery({ city: undefined }), "");
});
