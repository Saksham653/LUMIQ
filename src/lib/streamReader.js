// Incremental parser for OpenAI-style streaming replies
// ("data: {json}" lines). Network chunks can split anywhere — between
// lines, inside a line, even inside the "data: " prefix — so complete
// lines are parsed and the unfinished tail waits in a buffer until the
// rest arrives. Nothing is dropped and nothing is parsed twice.

export function createStreamReader() {
  let buffer = "";
  let finished = false;

  function parseLine(rawLine) {
    const line = rawLine.trim(); // tolerates \r from CRLF streams
    if (!line.startsWith("data:")) return null; // comments, event: lines, blanks
    const data = line.slice(5).trimStart();
    if (data === "[DONE]") {
      finished = true;
      return null;
    }
    try {
      const json = JSON.parse(data);
      return json.choices?.[0]?.delta?.content || "";
    } catch {
      // A complete but malformed line — ignore it rather than lose the
      // rest of the stream.
      return null;
    }
  }

  return {
    get finished() {
      return finished;
    },

    // Feed one decoded chunk; returns the content deltas found in the
    // complete lines it contains.
    push(chunkText) {
      if (finished || !chunkText) return [];
      buffer += chunkText;
      const deltas = [];
      let newlineAt;
      while ((newlineAt = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineAt);
        buffer = buffer.slice(newlineAt + 1);
        const delta = parseLine(line);
        if (finished) break;
        if (delta) deltas.push(delta);
      }
      return deltas;
    },

    // Call when the network stream ends: a final line may arrive with
    // no trailing newline and still counts.
    flush() {
      const rest = buffer;
      buffer = "";
      if (finished || !rest.trim()) return [];
      const delta = parseLine(rest);
      return delta ? [delta] : [];
    },
  };
}
