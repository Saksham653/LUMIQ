// The dataset shape produced by the shared web pipeline (buildDataset,
// datasetFromPreview): columns, typed rows and a type per column.
export type ColumnKind = 'number' | 'percent' | 'money' | 'date' | 'text';

export type ColumnType = { type: ColumnKind; symbol?: string };

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export type Dataset = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  columns: string[];
  data: Row[];
  columnTypes: Record<string, ColumnType>;
};
