import assert from "node:assert/strict";
import { test } from "node:test";
import {
  localeFromPath,
  matchBrowserLocale,
  pickLocalized,
  stripLocalePrefix,
  withLocale,
} from "../src/i18n";

test("withLocale keeps English unprefixed and prefixes other locales", () => {
  assert.equal(withLocale("/countries/canada", "en"), "/countries/canada");
  assert.equal(withLocale("/", "en"), "/");
  assert.equal(withLocale("/countries/canada", "zh-Hans"), "/zh-Hans/countries/canada");
  assert.equal(withLocale("/", "zh-Hans"), "/zh-Hans");
  assert.equal(
    withLocale("/compare?programs=a,b", "zh-Hans"),
    "/zh-Hans/compare?programs=a,b",
  );
});

test("stripLocalePrefix and localeFromPath round-trip bare paths", () => {
  assert.equal(stripLocalePrefix("/zh-Hans/countries"), "/countries");
  assert.equal(stripLocalePrefix("/countries"), "/countries");
  assert.equal(localeFromPath("/zh-Hans/filter"), "zh-Hans");
  assert.equal(localeFromPath("/filter"), "en");
});

test("pickLocalized falls back to English", () => {
  assert.equal(pickLocalized({ en: "Canada", "zh-Hans": "加拿大" }, "zh-Hans"), "加拿大");
  assert.equal(pickLocalized({ en: "Canada" }, "zh-Hans"), "Canada");
});

test("matchBrowserLocale maps common Chinese tags", () => {
  assert.equal(matchBrowserLocale("zh-CN"), "zh-Hans");
  assert.equal(matchBrowserLocale("zh"), "zh-Hans");
  assert.equal(matchBrowserLocale("en-US"), "en");
  assert.equal(matchBrowserLocale("zh-TW"), null);
  assert.equal(matchBrowserLocale("fr-FR"), null);
});
