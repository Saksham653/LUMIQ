// Data health's deep dive. The correlation matrix and anomaly stats
// are computed locally and work without a key; only the written
// interpretation needs Groq. State (labAnalysis/labLoading) stays
// owned by the caller so it survives screen switches.

import { callGroq } from "../ai/client.js";
import { calcPearsonCorrelation, getAnomalies } from "../lib/analysis.js";
import { numericPairs, numericEntries } from "../lib/stats.js";
import { numericColumns } from "../data/dataset.js";

export function useDeepDive({ apiKey, ds, setLabAnalysis, setLabLoading }) {
  const numericCols = numericColumns(ds);

  const runDeepDive = async () => {
    if (!ds) return;
    setLabLoading(true);
    setLabAnalysis(null);

    try {
      // 1. Calculate Correlation Matrix
      const matrix = [];
      for (let i = 0; i < numericCols.length; i++) {
        const row = [];
        for (let j = 0; i < numericCols.length && j < numericCols.length; j++) {
          if (i === j) row.push(1);
          else {
            // Only rows where BOTH columns have real numbers count;
            // blanks are skipped instead of entering as zeros.
            const { xs, ys } = numericPairs(ds.data, numericCols[i], numericCols[j]);
            row.push(xs.length >= 2 ? calcPearsonCorrelation(xs, ys) : 0);
          }
        }
        matrix.push(row);
      }

      // 2. Find Top Anomalies across all metrics
      let allAnomalies = [];
      numericCols.forEach(col => {
        // Outlier detection skips blank cells; indices map back to the
        // original rows so a blank never shifts which row is flagged.
        const entries = numericEntries(ds.data, col);
        const { anomalies } = getAnomalies(entries.map(e => e.value), 2.8); // High threshold
        anomalies.forEach(a => {
          allAnomalies.push({ metric: col, rowIdx: entries[a.index].index, value: a.value, zScore: a.zScore });
        });
      });
      allAnomalies.sort((a, b) => b.zScore - a.zScore);
      const topAnomalies = allAnomalies.slice(0, 5);

      // 3. Find strongest correlations (positive or negative)
      const strongCorrelations = [];
      for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
          const val = matrix[i][j];
          if (Math.abs(val) > 0.6) {
            strongCorrelations.push({ col1: numericCols[i], col2: numericCols[j], val });
          }
        }
      }

      // 4. Send the derived statistics (never rows) to Groq for the
      // written interpretation — only when a real key is connected.
      let analysisText = null;
      if (apiKey && apiKey !== "demo") {
        const prompt = `Act as an expert Data Scientist. I have analyzed the dataset "${ds.name}" and found these statistical patterns.
Explain what they mean in plain, non-technical business English.

STRONGEST CORRELATIONS (1 = perfect positive, -1 = perfect negative):
${strongCorrelations.length ? strongCorrelations.map(c => `- ${c.col1} vs ${c.col2}: ${c.val.toFixed(2)}`).join('\n') : "None detected above 0.6"}

TOP ANOMALIES (Z-Score > 2.8):
${topAnomalies.length ? topAnomalies.map(a => `- Row #${a.rowIdx}: ${a.metric} was ${a.value.toFixed(1)} (Z-score: ${a.zScore.toFixed(1)})`).join('\n') : "No significant anomalies found."}

Provide a short "Executive Summary" paragraph, then a "Key Findings" bulleted list. Do NOT output markdown code blocks, just raw text with markdown formatting (bold/italics).`;

        analysisText = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { });
      }

      setLabAnalysis({
        matrix,
        columns: numericCols,
        anomalies: topAnomalies,
        analysisText
      });
    } catch (e) {
      setLabAnalysis({ error: e.message });
    }
    setLabLoading(false);
  };

  return { runDeepDive };
}
