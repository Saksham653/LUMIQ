import { describe, it, expect } from "vitest";
import { extractNumbers, collectCandidates, collectLabelledCandidates, verifyNumbers } from "./numberCheck.js";
import { resolveNumberFormat } from "../lib/numberFormat.js";

describe("extractNumbers", () => {
  it("reads plain, comma-grouped and Indian-grouped numbers", () => {
    const nums = extractNumbers("Revenue was 4,677,000 or 46,77,000 or 4677000.");
    expect(nums.map((n) => n.value)).toEqual([4677000, 4677000, 4677000]);
  });

  it("reads %, K, M, lakh and crore", () => {
    const nums = extractNumbers("Margin 25.3%, spend 97K, revenue 4.68M, 1.2 lakh, 2 crore.");
    expect(nums.map((n) => n.value)).toEqual([25.3, 97000, 4680000, 120000, 20000000]);
  });

  it("reads लाख and करोड़ in Hindi answers, both ways of typing ड़", () => {
    const nums = extractNumbers("बिक्री 2.45 लाख रही, कुल 1.2 करोड़ और 3 करोड़।");
    [245000, 12000000, 30000000].forEach((value, i) => expect(nums[i].value).toBeCloseTo(value, 6));
    expect(nums).toHaveLength(3);
    expect(nums.map((n) => n.unit)).toEqual(["lakh", "crore", "crore"]);
    expect(nums[0].tolerance).toBeCloseTo(500, 9);
    expect(verifyNumbers("Jan में 2.45 लाख", [245000]).unverified).toBe(0);
    expect(verifyNumbers("Jan में 2.9 लाख", [245000]).unverified).toBe(1);
  });

  it("reads thousands grouped with thin or no-break spaces, not ordinary ones", () => {
    const nums = extractNumbers("Jan 780 000, Jun 1 014 000 and 4 677 000.");
    expect(nums.map((n) => n.value)).toEqual([780000, 1014000, 4677000]);
    expect(verifyNumbers("Jan 780 000.", [780000]).unverified).toBe(0);
    // An ordinary space keeps two numbers apart: a year next to a count.
    expect(extractNumbers("In 2024 780 orders").map((n) => n.value)).toEqual([2024, 780]);
    // A space before something other than three digits is not grouping.
    expect(extractNumbers("12 34").map((n) => n.value)).toEqual([12, 34]);
  });

  it("a number at the end of a sentence still parses with its unit", () => {
    const nums = extractNumbers("It reached 4.68M.");
    expect(nums).toHaveLength(1);
    expect(nums[0].value).toBe(4680000);
  });

  it("skips identifiers, versions and letter-adjacent digits", () => {
    expect(extractNumbers("W2 and Q1 and v1.2.3 and ab12")).toHaveLength(0);
  });

  it("tolerance follows the precision shown", () => {
    const [a] = extractNumbers("3.4K");
    expect(a.value).toBe(3400);
    expect(a.tolerance).toBeCloseTo(50, 9);
    const [b] = extractNumbers("45%");
    expect(b.tolerance).toBeCloseTo(0.5, 9);
    const [c] = extractNumbers("45.2");
    expect(c.tolerance).toBeCloseTo(0.05, 9);
  });
});

describe("verifyNumbers (F8 checker)", () => {
  const table = [
    { region: "South", total: 1331000, share: 28.46 },
    { region: "North", total: 935000, share: 19.99 },
    { cohort: "2024-Q1", rate: 7 },
  ];
  const candidates = collectCandidates(table, [12, 4]);

  it("verifies exact, rounded and scaled quotes of table values", () => {
    const text = "South made 1,331,000 (28.46%), roughly 1.33M or 28.5%, from 12 rows.";
    const { segments, checked, unverified } = verifyNumbers(text, candidates);
    expect(checked).toBe(5);
    expect(unverified).toBe(0);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("flags numbers that match nothing in the table", () => {
    const { segments, unverified } = verifyNumbers("North made 999,999 which is 55% of sales.", candidates);
    expect(unverified).toBe(2);
    const flagged = segments.filter((s) => s.number !== undefined && !s.verified).map((s) => s.text);
    expect(flagged).toEqual(["999,999", "55%"]);
  });

  it("numbers inside text cells count as candidates (2024-Q1 → 2024)", () => {
    const { unverified } = verifyNumbers("The 2024 cohorts churned at 7%.", candidates);
    expect(unverified).toBe(0);
  });

  it("rounding to fewer digits verifies, a wrong digit does not", () => {
    const ok = verifyNumbers("About 1.3M.", candidates);
    expect(ok.unverified).toBe(0);
    const bad = verifyNumbers("About 1.4M.", candidates);
    expect(bad.unverified).toBe(1);
  });

  it("Indian grouping and lakh quotes verify against the same value", () => {
    const { unverified } = verifyNumbers("That is 9,35,000, about 9.35 lakh.", candidates);
    expect(unverified).toBe(0);
  });

  it("segments always reassemble the original text", () => {
    for (const text of [
      "No numbers here.",
      "Edge 5",
      "5 starts and ends 9",
      "Mixed 1,234 and junk v1.2.3 and 45% end.",
      "",
    ]) {
      const { segments } = verifyNumbers(text, candidates);
      expect(segments.map((s) => s.text).join("")).toBe(text);
    }
  });
});

describe("answers in every LUMIQ language", () => {
  // The sales sample: 12 months, total 4,677,000, December 712,000,
  // February 198,000, Electronics 51.1% of revenue.
  const candidates = collectCandidates(
    [
      { month: "Dec", revenue: 712000 },
      { month: "Feb", revenue: 198000 },
      { total: 4677000, share: 51.1 },
    ],
    [12, 12, 3]
  );
  const values = (text, options) => extractNumbers(text, options).map((n) => n.value);
  const check = (text, options) => verifyNumbers(text, candidates, options);

  it("English: 4.68M, 712,000, 51.1%", () => {
    const text = "Revenue adds up to 4.68M across the 12 months; December was highest at 712,000 and Electronics took 51.1%.";
    expect(values(text, { language: "en" })).toEqual([4680000, 12, 712000, 51.1]);
    expect(check(text, { language: "en" }).unverified).toBe(0);
  });

  it("German: decimal comma, dot grouping, Mio. and 51,1 %", () => {
    const text =
      "Dein Umsatz beträgt in den 12 Monaten insgesamt 4,68 Mio. Am höchsten war der Dezember mit 712.000, am niedrigsten der Februar mit 198.000. Elektronik: 51,1 %.";
    expect(values(text, { language: "de" })).toEqual([12, 4680000, 712000, 198000, 51.1]);
    expect(check(text, { language: "de" })).toMatchObject({ checked: 5, unverified: 0 });
    // The same digits read the English way would be wrong, so the language decides.
    expect(values("712.000", { language: "en" })).toEqual([712]);
  });

  it("German: a decimal dot written by habit still reads as decimals", () => {
    expect(values("insgesamt 4.68 Mio. und 1.234,5", { language: "de" })).toEqual([4680000, 1234.5]);
  });

  it("Spanish: 4,68 M, 712 mil, millones", () => {
    const text = "Los ingresos suman 4,68 M en 12 meses; diciembre llegó a 712 mil y febrero a 198.000. En total 4,68 millones.";
    expect(values(text, { language: "es" })).toEqual([4680000, 12, 712000, 198000, 4680000]);
    expect(check(text, { language: "es" }).unverified).toBe(0);
  });

  it("French: narrow no-break or ordinary spaces between thousands, 51,1 %", () => {
    const text = "Total 4,68 M sur 12 mois. Décembre : 712 000 ; février : 198 000. Électronique 51,1 %.";
    expect(values(text, { language: "fr" })).toEqual([4680000, 12, 712000, 198000, 51.1]);
    expect(check(text, { language: "fr" }).unverified).toBe(0);
  });

  it("Japanese: 万 and 億; dates like 12月 and 2月 are not checked", () => {
    const text = "12か月の売上合計は468万です。最も多かったのは12月の71.2万、最も少なかったのは2月の19.8万でした。";
    expect(values(text, { language: "ja" })).toEqual([12, 4680000, 712000, 198000]);
    expect(check(text, { language: "ja" })).toMatchObject({ checked: 4, unverified: 0 });
    expect(values("2024年の売上は1.2億円", { language: "ja" })).toEqual([120000000]);
  });

  it("Chinese: 万 and 亿", () => {
    const text = "总收入为468万元，最高的是12月的71.2万。";
    expect(values(text, { language: "zh" })).toEqual([4680000, 712000]);
    expect(check(text, { language: "zh" }).unverified).toBe(0);
    expect(values("约1.2亿", { language: "zh" })).toEqual([120000000]);
  });

  it("Hebrew: numbers stay left to right, and a prefix like ב- is not a minus", () => {
    const text = "סך ההכנסות ב-12 החודשים הוא 4.68M. החודש הגבוה ביותר היה דצמבר עם 712,000, והנמוך ביותר פברואר עם 198,000.";
    expect(values(text, { language: "he" })).toEqual([12, 4680000, 712000, 198000]);
    expect(check(text, { language: "he" })).toMatchObject({ checked: 4, unverified: 0 });
  });

  it("Hindi: लाख with the Hindi format", () => {
    const text = "कुल revenue 46.8 लाख है; दिसंबर में 7.12 लाख।";
    expect(values(text, { language: "hi" })).toEqual([4680000, 712000]);
    expect(check(text, { language: "hi" }).unverified).toBe(0);
  });

  it("a currency sign before or after the number is not part of it", () => {
    expect(values("€4.68M or ₪1,234.5 or ¥468万 or 1,234.5 ₪", { language: "en" })).toEqual([
      4680000, 1234.5, 4680000, 1234.5,
    ]);
    expect(values("4,68 Mio. € und 712.000 €", { language: "de" })).toEqual([4680000, 712000]);
  });

  it("a range is two positive numbers, a spaced minus is still negative", () => {
    expect(values("10-20 rows", { language: "en" })).toEqual([10, 20]);
    expect(values("change of -3.5% and (−2)", { language: "en" })).toEqual([-3.5, -2]);
  });

  it("a style picked by hand decides, and a full format works the same", () => {
    expect(values("1.234,5", { language: "en", style: "dot-comma" })).toEqual([1234.5]);
    expect(values("1.234,5", resolveNumberFormat("de"))).toEqual([1234.5]);
    expect(values("12,34,567.8", resolveNumberFormat("hi"))).toEqual([1234567.8]);
  });

  it("a wrong number in any language is still caught", () => {
    expect(check("Der Dezember lag bei 713.000.", { language: "de" }).unverified).toBe(1);
    expect(check("12月は75万でした。", { language: "ja" }).unverified).toBe(1);
  });
});

describe("Devanagari digits and Indian number words", () => {
  it("reads ०-९ like 0-9, with Indian grouping, and keeps the text as written", () => {
    const text = "दिसंबर में ७,१२,००० रहे, यानी ७.१२ लाख।";
    const nums = extractNumbers(text, { language: "hi" });
    expect(nums.map((n) => n.value)).toEqual([712000, 712000]);
    expect(nums.map((n) => n.raw)).toEqual(["७,१२,०००", "७.१२ लाख"]);
    const check = verifyNumbers(text, [712000], { language: "hi" });
    expect(check).toMatchObject({ total: 2, checkedCount: 2, unverified: 0 });
    expect(check.segments.map((s) => s.text).join("")).toBe(text);
    expect(verifyNumbers("दिसंबर में ७,१३,००० रहे।", [712000]).unverified).toBe(1);
  });

  it("Devanagari digits glued to a Latin letter are still not numbers", () => {
    expect(extractNumbers("W२ and Q१")).toHaveLength(0);
  });

  it("reads lac and करोड typed without the nukta", () => {
    const nums = extractNumbers("5 lacs, 2.5 lac and 3 करोड");
    expect(nums.map((n) => n.value)).toEqual([500000, 250000, 30000000]);
    expect(nums.map((n) => n.unit)).toEqual(["lakh", "lakh", "crore"]);
  });

  it("Indian grouping, lakh and thin-space grouping verify the same value", () => {
    for (const text of ["North 9,35,000", "North 9.35 lakh", "North 935 000", "North ९,३५,०००"]) {
      expect(verifyNumbers(text, [935000]).unverified).toBe(0);
    }
  });
});

describe("verifyNumbers counts", () => {
  it("gives total and checkedCount next to the old fields", () => {
    const candidates = collectCandidates([{ region: "South", total: 1331000, share: 28.46 }], [12]);
    expect(verifyNumbers("South made 1,331,000 (28.46%) from 12 rows, not 999.", candidates)).toMatchObject({
      checked: 4,
      total: 4,
      checkedCount: 3,
      unverified: 1,
    });
    expect(verifyNumbers("No numbers here.", candidates)).toMatchObject({ checked: 0, total: 0, checkedCount: 0, unverified: 0 });
  });
});

describe("numbers tied to their row (labelled candidates)", () => {
  const months = [
    { month: "October", revenue: 1200 },
    { month: "September", revenue: 900 },
  ];
  const extras = [24, 2];
  const labelled = collectLabelledCandidates(months, extras);
  const plain = collectCandidates(months, extras);

  it("collectLabelledCandidates has the same values as collectCandidates, with row names", () => {
    expect(labelled.map((c) => (typeof c === "number" ? c : c.value))).toEqual(plain);
    expect(labelled[0]).toEqual({ value: 1200, label: "October" });
    expect(labelled.slice(-2)).toEqual([24, 2]);
    const mixed = collectLabelledCandidates([
      { region: "North", month: "Oct", total: 5 },
      { day: "2024-10-01", total: 7 },
      { cohort: "2024-Q1", rate: 3 },
    ]);
    expect(mixed[0]).toEqual({ value: 5, label: ["North", "Oct"] });
    expect(mixed.filter((c) => c.label === null).map((c) => c.value)).toEqual([2024, 10, 1, 7]);
    expect(mixed.filter((c) => c.label === "2024-Q1").map((c) => c.value)).toEqual([2024, 3]);
  });

  it("a swapped pair fails (the old check passed it)", () => {
    const text = "October 900 and September 1,200.";
    expect(verifyNumbers(text, plain).unverified).toBe(0);
    const check = verifyNumbers(text, labelled);
    expect(check).toMatchObject({ total: 2, checkedCount: 0, unverified: 2 });
    expect(check.segments.map((s) => s.text).join("")).toBe(text);
  });

  it("the correct pair passes", () => {
    expect(verifyNumbers("October 1,200 and September 900.", labelled)).toMatchObject({
      total: 2,
      checkedCount: 2,
      unverified: 0,
    });
    expect(verifyNumbers("October revenue was 1,200, while September had 900.", labelled).unverified).toBe(0);
    expect(verifyNumbers("October 1,200 from 24 rows.", labelled).unverified).toBe(0);
  });

  it("a comma straight after the row name keeps the number tied to it", () => {
    expect(verifyNumbers("In October, revenue was 900.", labelled).unverified).toBe(1);
    expect(verifyNumbers("In October, revenue was 1,200.", labelled).unverified).toBe(0);
  });

  it("short and long month names name the same row", () => {
    const short = collectLabelledCandidates([
      { month: "Dec", revenue: 712000 },
      { month: "Feb", revenue: 198000 },
    ]);
    expect(verifyNumbers("December was highest at 712,000 and February lowest at 198,000.", short).unverified).toBe(0);
    expect(verifyNumbers("December was highest at 198,000 and February lowest at 712,000.", short).unverified).toBe(2);
    expect(verifyNumbers("Dec 712,000, Feb 198,000.", short).unverified).toBe(0);
  });

  it("unlabelled numbers keep the old rule", () => {
    for (const text of [
      "Revenue reached 2,100 from 24 rows.",
      "The 2 months add up to 2,100.",
      "1,200 in October and 900 in September.",
      "Sales were 900 in October and 1,200 in September.",
      "october 900 and september 1,200.",
      "Edge 5",
      "",
    ]) {
      expect(verifyNumbers(text, labelled)).toEqual(verifyNumbers(text, plain));
    }
  });

  it("plain-number callers get exactly the old result", () => {
    const oldRule = (text, candidates) =>
      extractNumbers(text).map((n) => candidates.some((c) => Math.abs(c - n.value) <= n.tolerance + 1e-9));
    for (const text of ["October 900 and September 1,200.", "North made 999,999 which is 55% of sales.", "In October, 24 and 7."]) {
      const { segments } = verifyNumbers(text, plain);
      expect(segments.filter((s) => s.number !== undefined).map((s) => s.verified)).toEqual(oldRule(text, plain));
    }
  });

  it("a percent quoted for the wrong group fails", () => {
    const categories = collectLabelledCandidates([
      { category: "Electronics", revenue: 2390000, share: 51.1 },
      { category: "Fashion", revenue: 1412000, share: 30.2 },
      { category: "Home", revenue: 875000, share: 18.7 },
    ]);
    expect(verifyNumbers("Electronics took 30.2% of revenue.", categories).unverified).toBe(1);
    expect(verifyNumbers("Electronics took 30.2% of revenue.", collectCandidates([{ share: 30.2 }])).unverified).toBe(0);
    expect(verifyNumbers("Electronics took 51.1% of revenue and Fashion 30.2%.", categories).unverified).toBe(0);
    expect(verifyNumbers("Fashion's 18.7% share trails Electronics at 51.1%.", categories).unverified).toBe(1);
  });

  it("never fails a number the phrasing does not tie to that row", () => {
    const short = collectLabelledCandidates([
      { month: "Dec", revenue: 712000 },
      { month: "Feb", revenue: 198000 },
    ]);
    for (const text of [
      "December beat February with 712,000.",
      "Revenue peaked in December at 712,000 and was lowest at 198,000 in February.",
      "December 712,000 vs the lowest month at 198,000.",
      "The top month was December with 712,000, almost 4 times the lowest month's 198,000.",
    ]) {
      expect(verifyNumbers(text, [...short, 4]).unverified).toBe(0);
    }
    // A row name straight after a number, with no number of its own, may be
    // the number's name ("198,000 in Fashion"), so the number is not tied.
    const twoLevel = collectLabelledCandidates([
      { month: "Dec", category: "Electronics", revenue: 712000 },
      { month: "Dec", category: "Fashion", revenue: 198000 },
    ]);
    expect(verifyNumbers("December was 712,000 in Electronics and 198,000 in Fashion.", twoLevel).unverified).toBe(0);
    const quarters = collectLabelledCandidates([
      { quarter: "Q1", churn: 7 },
      { quarter: "Q2", churn: 9 },
    ]);
    expect(verifyNumbers("In Q1 churn was 7% versus 9% in Q2.", quarters).unverified).toBe(0);
    expect(verifyNumbers("In Q1 churn was 9% versus Q2's 7%.", quarters).unverified).toBe(2);
  });

  it("a number inside a row name is checked the old way", () => {
    const cohorts = collectLabelledCandidates([
      { cohort: "2024-Q1", rate: 7 },
      { cohort: "2024-Q2", rate: 9 },
    ]);
    expect(verifyNumbers("2024-Q1 churned at 7% and 2024-Q2 at 9%.", cohorts)).toMatchObject({ total: 4, unverified: 0 });
    expect(verifyNumbers("2024-Q1 churned at 9% and 2024-Q2 at 7%.", cohorts)).toMatchObject({
      total: 4,
      checkedCount: 2,
      unverified: 2,
    });
  });

  it("Hindi row names and Devanagari digits", () => {
    const cities = collectLabelledCandidates([
      { city: "दिल्ली", sales: 500 },
      { city: "मुंबई", sales: 700 },
    ]);
    expect(verifyNumbers("दिल्ली में ५०० और मुंबई में ७००।", cities, { language: "hi" }).unverified).toBe(0);
    expect(verifyNumbers("दिल्ली में ७०० और मुंबई में ५००।", cities, { language: "hi" }).unverified).toBe(2);
  });

  it("Indian grouping on a swapped pair", () => {
    const regions = collectLabelledCandidates([
      { region: "North", total: 935000 },
      { region: "South", total: 1331000 },
    ]);
    expect(verifyNumbers("North made 9,35,000 and South 13,31,000.", regions).unverified).toBe(0);
    expect(verifyNumbers("North made 13,31,000 and South 9,35,000.", regions).unverified).toBe(2);
    expect(verifyNumbers("North 9.35 lakh, South 13.31 lakh.", regions).unverified).toBe(0);
  });

  it("the sample answers in every language still pass with row names", () => {
    const sample = collectLabelledCandidates(
      [
        { month: "Dec", revenue: 712000 },
        { month: "Feb", revenue: 198000 },
        { total: 4677000, share: 51.1 },
      ],
      [12, 12, 3]
    );
    const answers = [
      ["en", "Revenue adds up to 4.68M across the 12 months; December was highest at 712,000 and Electronics took 51.1%."],
      ["de", "Am höchsten war der Dezember mit 712.000, am niedrigsten der Februar mit 198.000. Elektronik: 51,1 %."],
      ["es", "Los ingresos suman 4,68 M en 12 meses; diciembre llegó a 712 mil y febrero a 198.000."],
      ["fr", "Total 4,68 M sur 12 mois. Décembre : 712 000 ; février : 198 000. Électronique 51,1 %."],
      ["ja", "12か月の売上合計は468万です。最も多かったのは12月の71.2万、最も少なかったのは2月の19.8万でした。"],
      ["he", "סך ההכנסות ב-12 החודשים הוא 4.68M. החודש הגבוה ביותר היה דצמבר עם 712,000."],
      ["hi", "कुल revenue 46.8 लाख है; Dec में 7.12 लाख और Feb में 1.98 लाख।"],
    ];
    for (const [language, text] of answers) {
      expect(verifyNumbers(text, sample, { language }).unverified).toBe(0);
    }
    expect(
      verifyNumbers("कुल revenue 46.8 लाख है; Dec में 1.98 लाख और Feb में 7.12 लाख।", sample, { language: "hi" }).unverified
    ).toBe(2);
  });
});
