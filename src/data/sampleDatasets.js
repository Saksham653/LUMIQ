// The three built-in sample datasets, run through the same
// buildDataset pipeline as uploads so they carry columnTypes.

import { buildDataset } from "./dataset.js";

const RAW = {
  sales: {
    name: "E-Commerce Sales",
    icon: "🛒",
    description: "12 months of online sales data",
    columns: ["month", "revenue", "orders", "avg_order_value", "region", "category", "returns", "profit_margin"],
    rows: [
      { month: "Jan", revenue: 245000, orders: 1820, avg_order_value: 134.6, region: "North", category: "Electronics", returns: 4.2, profit_margin: 23.1 },
      { month: "Feb", revenue: 198000, orders: 1540, avg_order_value: 128.6, region: "South", category: "Clothing", returns: 6.8, profit_margin: 31.2 },
      { month: "Mar", revenue: 312000, orders: 2210, avg_order_value: 141.2, region: "East", category: "Electronics", returns: 3.9, profit_margin: 22.7 },
      { month: "Apr", revenue: 289000, orders: 2050, avg_order_value: 140.9, region: "West", category: "Home", returns: 5.1, profit_margin: 28.4 },
      { month: "May", revenue: 334000, orders: 2380, avg_order_value: 140.3, region: "North", category: "Clothing", returns: 7.2, profit_margin: 29.8 },
      { month: "Jun", revenue: 378000, orders: 2720, avg_order_value: 138.9, region: "East", category: "Electronics", returns: 4.4, profit_margin: 21.9 },
      { month: "Jul", revenue: 421000, orders: 3010, avg_order_value: 139.9, region: "South", category: "Electronics", returns: 3.7, profit_margin: 20.8 },
      { month: "Aug", revenue: 398000, orders: 2890, avg_order_value: 137.7, region: "West", category: "Home", returns: 5.8, profit_margin: 27.3 },
      { month: "Sep", revenue: 356000, orders: 2540, avg_order_value: 140.2, region: "North", category: "Clothing", returns: 6.3, profit_margin: 30.5 },
      { month: "Oct", revenue: 445000, orders: 3210, avg_order_value: 138.6, region: "East", category: "Electronics", returns: 4.1, profit_margin: 22.4 },
      { month: "Nov", revenue: 589000, orders: 4320, avg_order_value: 136.3, region: "West", category: "Electronics", returns: 5.2, profit_margin: 19.7 },
      { month: "Dec", revenue: 712000, orders: 5180, avg_order_value: 137.4, region: "South", category: "Clothing", returns: 8.9, profit_margin: 26.1 },
    ],
  },
  marketing: {
    name: "Marketing Campaign",
    icon: "📊",
    description: "Multi-channel campaign performance",
    columns: ["channel", "spend", "impressions", "clicks", "conversions", "cac", "roas", "week"],
    rows: [
      { channel: "Google Ads", spend: 45000, impressions: 2100000, clicks: 42000, conversions: 1260, cac: 35.7, roas: 4.2, week: "W1" },
      { channel: "Meta Ads", spend: 38000, impressions: 3400000, clicks: 51000, conversions: 918, cac: 41.4, roas: 3.6, week: "W1" },
      { channel: "Email", spend: 8000, impressions: 890000, clicks: 71200, conversions: 2136, cac: 3.7, roas: 12.8, week: "W1" },
      { channel: "SEO", spend: 12000, impressions: 560000, clicks: 28000, conversions: 840, cac: 14.3, roas: 8.4, week: "W1" },
      { channel: "Google Ads", spend: 52000, impressions: 2380000, clicks: 47600, conversions: 1428, cac: 36.4, roas: 4.1, week: "W2" },
      { channel: "Meta Ads", spend: 41000, impressions: 3700000, clicks: 55500, conversions: 999, cac: 41.0, roas: 3.7, week: "W2" },
      { channel: "Email", spend: 8000, impressions: 950000, clicks: 76000, conversions: 2280, cac: 3.5, roas: 13.2, week: "W2" },
      { channel: "SEO", spend: 12000, impressions: 610000, clicks: 30500, conversions: 915, cac: 13.1, roas: 9.1, week: "W2" },
    ],
  },
  churn: {
    name: "Customer Churn",
    icon: "👥",
    description: "SaaS customer retention analysis",
    columns: ["cohort", "customers", "churned", "churn_rate", "ltv", "mrr", "support_tickets", "nps"],
    rows: [
      { cohort: "2024-Q1", customers: 1240, churned: 87, churn_rate: 7.0, ltv: 2840, mrr: 186000, support_tickets: 3.2, nps: 42 },
      { cohort: "2024-Q2", customers: 1580, churned: 95, churn_rate: 6.0, ltv: 3120, mrr: 237000, support_tickets: 2.8, nps: 48 },
      { cohort: "2024-Q3", customers: 1920, churned: 115, churn_rate: 5.9, ltv: 3450, mrr: 288000, support_tickets: 2.5, nps: 54 },
      { cohort: "2024-Q4", customers: 2340, churned: 140, churn_rate: 5.9, ltv: 3780, mrr: 351000, support_tickets: 2.1, nps: 61 },
      { cohort: "2025-Q1", customers: 2890, churned: 130, churn_rate: 4.5, ltv: 4210, mrr: 433500, support_tickets: 1.9, nps: 67 },
    ],
  },
};

export const SAMPLE_DATASETS = Object.fromEntries(
  Object.entries(RAW).map(([key, d]) => [
    key,
    buildDataset({ id: `sample:${key}`, name: d.name, icon: d.icon, description: d.description, columns: d.columns, rows: d.rows }),
  ])
);
