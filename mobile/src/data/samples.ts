import { buildDataset } from '@core/data/dataset.js';
import { SAMPLE_DATASETS as WEB_SAMPLE_DATASETS } from '@core/data/sampleDatasets.js';

import type { Dataset } from '@/data/types';
import { translate, type Language, type StringKey } from '@/i18n';
import { localText } from '@/i18n/local';
import type { IconName } from '@/ui/icon-set';

import { SCHOOL_FEES_COLUMNS, schoolFeesRows } from './samples/school-fees';
import { SHOP_SALES_COLUMNS, shopSalesRows } from './samples/shop-sales';
import { SAMPLE_STRINGS, type SampleStringKey } from './samples/strings';

// The web app's three sample files, run through the same shared pipeline, with
// their names and descriptions translated for the phone.
export type SampleKey = 'sales' | 'marketing' | 'churn';

export type SampleInfo = {
  key: SampleKey;
  id: string;
  icon: string;
  rows: number;
  columns: number;
  nameKey: StringKey;
  descKey: StringKey;
};

const ORDER: SampleKey[] = ['sales', 'marketing', 'churn'];

export const SAMPLES: SampleInfo[] = ORDER.map((key) => {
  const dataset = WEB_SAMPLE_DATASETS[key];
  return {
    key,
    id: dataset.id,
    icon: dataset.icon,
    rows: dataset.data.length,
    columns: dataset.columns.length,
    nameKey: `sample.${key}.name` as StringKey,
    descKey: `sample.${key}.desc` as StringKey,
  };
});

export function findSample(id: string | null): SampleInfo | null {
  return SAMPLES.find((sample) => sample.id === id) ?? null;
}

// --- The phone's own sample files --------------------------------------------

// Two more sample files, made on the phone from a fixed seed (the files in
// src/data/samples/): the same rows every time, built by the shared pipeline
// exactly like the three above and like a file the person opens, so they
// carry the same columns, rows and column types. Their words live beside them
// (samples/strings.ts), not in the shared dictionary.
export type PhoneSampleKey = 'shop' | 'fees';
export type AnySampleKey = SampleKey | PhoneSampleKey;

type PhoneSample = {
  key: PhoneSampleKey;
  icon: IconName;
  nameKey: SampleStringKey;
  descKey: SampleStringKey;
  dataset: Dataset;
};

function phoneSample(
  key: PhoneSampleKey,
  icon: IconName,
  nameKey: SampleStringKey,
  descKey: SampleStringKey,
  columns: string[],
  rows: object[],
): PhoneSample {
  const dataset = buildDataset({
    id: `sample:${key}`,
    // In English: what the app shows wherever it has no translated name.
    name: localText(SAMPLE_STRINGS, 'en', nameKey),
    icon: undefined,
    description: localText(SAMPLE_STRINGS, 'en', descKey),
    columns,
    rows,
  }) as Dataset;
  return { key, icon, nameKey, descKey, dataset };
}

const PHONE_SAMPLES: PhoneSample[] = [
  phoneSample('shop', 'currency', 'shop.name', 'shop.desc', SHOP_SALES_COLUMNS, shopSalesRows()),
  phoneSample('fees', 'calendar', 'fees.name', 'fees.desc', SCHOOL_FEES_COLUMNS, schoolFeesRows()),
];

// Every sample file by its key, "sample:shop" being SAMPLE_DATASETS.shop: the
// web app's three and the phone's two. It has the shape of the shared
// engine's SAMPLE_DATASETS, so the list of files can look samples up here.
export const SAMPLE_DATASETS: Record<string, Dataset> = {
  ...(WEB_SAMPLE_DATASETS as Record<string, Dataset>),
  ...Object.fromEntries(PHONE_SAMPLES.map((sample) => [sample.key, sample.dataset])),
};

// One row of the samples list, for any sample file, with its name and
// description in the language asked for.
export type SampleListItem = {
  key: AnySampleKey;
  id: string;
  icon: IconName;
  rows: number;
  columns: number;
  name: (language: Language) => string;
  description: (language: Language) => string;
};

// The icons Home's sample rows draw for the web app's three (sample-card.tsx).
const WEB_ICON: Record<SampleKey, IconName> = {
  sales: 'currency',
  marketing: 'chart-line',
  churn: 'chart-bar',
};

// Every sample file in list order: the shop and the school first, as the
// closest to the people trying the app, then the web app's three.
export const SAMPLE_LIST: SampleListItem[] = [
  ...PHONE_SAMPLES.map((sample) => ({
    key: sample.key,
    id: sample.dataset.id,
    icon: sample.icon,
    rows: sample.dataset.data.length,
    columns: sample.dataset.columns.length,
    name: (language: Language) => localText(SAMPLE_STRINGS, language, sample.nameKey),
    description: (language: Language) => localText(SAMPLE_STRINGS, language, sample.descKey),
  })),
  ...SAMPLES.map((sample) => ({
    key: sample.key,
    id: sample.id,
    icon: WEB_ICON[sample.key],
    rows: sample.rows,
    columns: sample.columns,
    name: (language: Language) => translate(language, sample.nameKey),
    description: (language: Language) => translate(language, sample.descKey),
  })),
];

// The name of any sample file in the given language; null for an id that is
// not a sample.
export function sampleName(id: string | null, language: Language): string | null {
  return SAMPLE_LIST.find((sample) => sample.id === id)?.name(language) ?? null;
}
