import { SAMPLE_DATASETS } from '@core/data/sampleDatasets.js';

import type { StringKey } from '@/i18n';

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
  const dataset = SAMPLE_DATASETS[key];
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
