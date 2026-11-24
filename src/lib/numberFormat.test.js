import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  LANGUAGES,
  currencyLabel,
  describeNumberFormat,
  formatAmount,
  formatAmountParts,
  formatCount,
  formatExact,
  formatNumber,
  formatPercent,
  resolveNumberFormat,
  setIntlEnabled,
} from "./numberFormat.js";

const NBSP = " ";
const NNBSP = " ";
const ltr = (text) => `⁦${text}⁩`;
const plain = { type: "number" };
const money = (symbol, currency) => ({ type: "money", symbol, ...(currency ? { currency } : {}) });

// Every expectation runs twice: with Intl.NumberFormat where it agrees with
// the fallback, and with the fallback alone (as on a phone without Intl).
describe.each([
  ["with Intl", true],
  ["fallback only", false],
])("number formats (%s)", (_, intl) => {
  beforeAll(() => setIntlEnabled(intl));
  afterAll(() => setIntlEnabled(true));

  it("writes 1234567.8 the way each language does, digits always 0-9", () => {
    const written = Object.fromEntries(
      LANGUAGES.map((lang) => [lang, formatNumber(1234567.8, resolveNumberFormat(lang))])
    );
    expect(written).toEqual({
      en: "1,234,567.8",
      hi: "12,34,567.8",
      es: "1.234.567,8",
      fr: `1${NNBSP}234${NNBSP}567,8`,
      de: "1.234.567,8",
      ja: "1,234,567.8",
      zh: "1,234,567.8",
      he: ltr("1,234,567.8"),
    });
  });

  it("shortens big numbers in each language's own words", () => {
    const short = (lang, value) => formatAmount(value, plain, resolveNumberFormat(lang));
    expect(short("en", 1200000)).toBe("1.2M");
    expect(short("en", 4677000)).toBe("4.68M");
    expect(short("en", 712000)).toBe("712K");
    expect(short("hi", 1200000)).toBe("12 लाख");
    expect(short("hi", 12000000)).toBe("1.2 करोड़");
    expect(short("hi", 4677000)).toBe("46.8 लाख");
    expect(short("es", 1200000)).toBe(`1,2${NBSP}M`);
    expect(short("es", 712000)).toBe(`712${NBSP}mil`);
    expect(short("fr", 1200000)).toBe(`1,2${NBSP}M`);
    expect(short("de", 1200000)).toBe(`1,2${NBSP}Mio.`);
    expect(short("de", 3400000000)).toBe(`3,4${NBSP}Mrd.`);
    expect(short("ja", 1234567.8)).toBe("123万");
    expect(short("ja", 120000000)).toBe("1.2億");
    expect(short("zh", 1234567.8)).toBe("123万");
    expect(short("zh", 120000000)).toBe("1.2亿");
    expect(short("he", 1200000)).toBe(ltr("1.2M"));
  });

  it("keeps smaller numbers exact where the language does", () => {
    const amount = (lang, value) => formatAmount(value, plain, resolveNumberFormat(lang));
    expect(amount("en", 1234)).toBe("1,234");
    expect(amount("de", 712000)).toBe("712.000"); // German has no short form for thousands
    expect(amount("hi", 98765)).toBe("98,765");
    expect(amount("en", 3.456)).toBe("3.46");
    expect(amount("de", 3.456)).toBe("3,46");
    expect(amount("en", 0)).toBe("0");
    expect(amount("en", null)).toBe("—");
  });

  it("moves up a unit when rounding reaches the next one", () => {
    const en = resolveNumberFormat("en");
    expect(formatAmount(999999, plain, en)).toBe("1M");
    expect(formatAmount(99999, plain, en)).toBe("100K");
    expect(formatAmount(9999999, plain, resolveNumberFormat("hi"))).toBe("1 करोड़");
    expect(formatAmount(99999999, plain, resolveNumberFormat("ja"))).toBe("1億");
  });

  it("writes percentages with the language's spacing", () => {
    expect(formatPercent(45, resolveNumberFormat("en"))).toBe("45%");
    expect(formatPercent(45, resolveNumberFormat("fr"))).toBe(`45${NNBSP}%`);
    expect(formatPercent(45, resolveNumberFormat("de"))).toBe(`45${NBSP}%`);
    expect(formatPercent(12.34, resolveNumberFormat("de"))).toBe(`12,3${NBSP}%`);
    expect(formatPercent(45, resolveNumberFormat("he"))).toBe(ltr("45%"));
    expect(formatAmount(28.46, { type: "percent" }, resolveNumberFormat("en"))).toBe("28.5%");
  });

  it("places the file's currency the way the language writes it, never converting", () => {
    expect(formatAmount(4677000, money("€"), resolveNumberFormat("en"))).toBe("€4.68M");
    expect(formatAmount(4677000, money("€"), resolveNumberFormat("de"))).toBe(`4,68${NBSP}Mio.${NBSP}€`);
    expect(formatAmount(4677000, money("€"), resolveNumberFormat("fr"))).toBe(`4,68${NBSP}M${NBSP}€`);
    expect(formatAmount(1234.5, money("₪"), resolveNumberFormat("he"))).toBe(`${ltr("1,234.5")}${NBSP}₪`);
    expect(formatAmount(4677000, money("₹"), resolveNumberFormat("hi"))).toBe("₹46.8 लाख");
    expect(formatAmount(-1234, money("$"), resolveNumberFormat("en"))).toBe("-$1,234");
    expect(formatAmount(-1234, money("€"), resolveNumberFormat("de"))).toBe(`-1.234${NBSP}€`);
  });

  it("splits an amount into currency, digits and unit, so the unit can be drawn lighter", () => {
    const parts = (lang, value, type) => {
      const { prefix, number, suffix } = formatAmountParts(value, type, resolveNumberFormat(lang));
      return [prefix, number, suffix];
    };
    expect(parts("en", 4677000, plain)).toEqual(["", "4.68", "M"]);
    expect(parts("en", 4677000, money("$"))).toEqual(["$", "4.68", "M"]);
    expect(parts("hi", 4677000, money("₹"))).toEqual(["₹", "46.8", " लाख"]);
    expect(parts("de", 4677000, money("€"))).toEqual(["", "4,68", `${NBSP}Mio.${NBSP}€`]);
    expect(parts("ja", 4677000, plain)).toEqual(["", "468", "万"]);
    expect(parts("en", 1234, plain)).toEqual(["", "1,234", ""]);
    expect(parts("fr", 45, { type: "percent" })).toEqual(["", "45", `${NNBSP}%`]);
    expect(parts("en", null, plain)).toEqual(["", "—", ""]);
    expect(formatAmountParts(1200000, plain, resolveNumberFormat("he")).rtl).toBe(true);
  });

  it("lets people pick a style by hand, whatever the language", () => {
    const de = (style) => resolveNumberFormat("de", style);
    expect(formatNumber(1234567.8, de("comma-dot"))).toBe("1,234,567.8");
    expect(formatNumber(1234567.8, de("space-comma"))).toBe(`1${NNBSP}234${NNBSP}567,8`);
    expect(formatNumber(1234567.8, resolveNumberFormat("en", "indian"))).toBe("12,34,567.8");
    expect(formatAmount(1200000, plain, resolveNumberFormat("en", "indian"))).toBe("12 lakh");
    expect(formatAmount(1234567.8, plain, resolveNumberFormat("en", "cjk"))).toBe("123万");
    expect(formatAmount(120000000, plain, resolveNumberFormat("zh", "cjk"))).toBe("1.2亿");
    // A western style in Hindi shortens with K, M and B.
    expect(formatAmount(1200000, plain, resolveNumberFormat("hi", "comma-dot"))).toBe("1.2M");
    expect(resolveNumberFormat("de", "auto").style).toBe("dot-comma");
    expect(resolveNumberFormat("xx").language).toBe("en");
  });

  it("formats counts and exact table figures without shortening", () => {
    expect(formatCount(1240.4, resolveNumberFormat("en"))).toBe("1,240");
    expect(formatCount(1234567, resolveNumberFormat("hi"))).toBe("12,34,567");
    expect(formatExact(4677000, resolveNumberFormat("de"))).toBe("4.677.000");
    expect(formatExact(137.4567, resolveNumberFormat("fr"))).toBe("137,46");
    expect(formatExact(-0.001, resolveNumberFormat("en"))).toBe("0");
    expect(formatExact(Number.NaN, resolveNumberFormat("en"))).toBe("—");
  });
});

describe("currencyLabel", () => {
  it("leaves every currency but the yen sign as the file wrote it", () => {
    expect(currencyLabel("$", undefined, "de")).toBe("$");
    expect(currencyLabel("₪", undefined, "en")).toBe("₪");
    expect(currencyLabel("", undefined, "en")).toBe("");
  });

  it("lets a clue in the file decide ¥, then the app language", () => {
    expect(currencyLabel("¥", "JPY", "ja")).toBe("¥");
    expect(currencyLabel("¥", "JPY", "en")).toBe("JP¥");
    expect(currencyLabel("¥", "JPY", "zh")).toBe("JP¥");
    expect(currencyLabel("¥", "CNY", "zh")).toBe("¥");
    expect(currencyLabel("¥", "CNY", "en")).toBe("CN¥");
    expect(currencyLabel("¥", undefined, "en")).toBe("¥");
    expect(currencyLabel("￥", undefined, "ja")).toBe("¥");
  });
});

describe("describeNumberFormat", () => {
  it("tells the AI the exact format, examples included", () => {
    expect(describeNumberFormat(resolveNumberFormat("de"))).toBe(
      "Write every number with the digits 0-9, using dots between thousands and a comma before decimals, for example 1.234.567,8. You may shorten large numbers (for example 4,68 Mio. or 1,2 Mrd.). Write percentages like 45 %."
    );
    expect(describeNumberFormat(resolveNumberFormat("hi"))).toContain("12 लाख or 1.2 करोड़");
    expect(describeNumberFormat(resolveNumberFormat("ja"))).toContain("468万 or 1.2億");
    expect(describeNumberFormat(resolveNumberFormat("en"))).toContain("45%.");
  });
});
