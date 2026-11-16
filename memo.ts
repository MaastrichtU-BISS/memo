/**
 * bl-memo — BlueLab Step 5. The client memorandum, with the citation guardrail
 * that defines BlueLab: a memo cannot advance unless every section cites at least
 * one obligation, every citation points at a real obligation, and every quoted
 * passage appears verbatim in that obligation's source text.
 *
 * The verbatim check reuses the adapter's invariant: SourcedObligation.source_text
 * is already verbatim-from-chunk, so a quote that is a substring of source_text is
 * transitively verbatim-from-source. No hallucinated support can pass.
 *
 * Self-contained (mirrors adapter.ts / relations.ts).
 */

// ── Upstream obligation payload (bluelab.obligation_set) ─────────────────────
export type DeonticType = 'power' | 'right' | 'obligation' | 'permission' | 'prohibition';
export type DeonticWord = 'shall' | 'shall not' | 'may' | 'must' | 'must not' | 'may not';

export interface SourcedObligation {
  agent: string;
  deontic_word: DeonticWord;
  deontic_type: DeonticType;
  action: string;
  passive_role?: string;
  atomic_statement: string;
  source_chunk_id: string;
  source_text: string;
  confidence?: number;
}

export interface ObligationSetPayload {
  model: string;
  obligations: SourcedObligation[];
}

// ── Memo structure ───────────────────────────────────────────────────────────
export interface MemoCitation {
  /** Stable obligation id (obl-N), aligned with bl-obligation-map. */
  obligation_id: string;
  /** Verbatim passage supporting the claim; must be a substring of the obligation's source_text. */
  quote_text: string;
}

export interface MemoSection {
  heading: string;
  content: string;
  citations: MemoCitation[];
}

export interface MemoPayload {
  title: string;
  sections: MemoSection[];
}

export interface GuardrailFailure { rule: string; detail: string; section_index: number }
export interface GuardrailResult { passed: boolean; failures: GuardrailFailure[] }

/** Stable, position-derived obligation id (must match bl-obligation-map). */
export function obligationId(index: number): string {
  return `obl-${index}`;
}

function normalize(s: string): string {
  // Collapse whitespace so a quote that differs only in spacing/newlines still
  // matches its source. Casing and wording must still be exact.
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Validate a memo against the obligation set.
 * passed === true only when every section is supported by real, verbatim citations.
 */
export function validateMemo(memo: MemoPayload, obligations: SourcedObligation[]): GuardrailResult {
  const byId = new Map(obligations.map((o, i) => [obligationId(i), o]));
  const failures: GuardrailFailure[] = [];

  memo.sections.forEach((section, i) => {
    if (!section.content || !normalize(section.content)) {
      failures.push({ rule: 'empty_section', detail: `section "${section.heading}" has no content`, section_index: i });
    }
    if (!section.citations || section.citations.length === 0) {
      failures.push({ rule: 'no_citation', detail: `section "${section.heading}" cites no obligation`, section_index: i });
      return;
    }
    section.citations.forEach((c) => {
      const obl = byId.get(c.obligation_id);
      if (!obl) {
        failures.push({ rule: 'dangling_citation', detail: `${c.obligation_id} is not an obligation`, section_index: i });
        return;
      }
      if (!c.quote_text || !normalize(c.quote_text)) {
        failures.push({ rule: 'empty_quote', detail: `citation to ${c.obligation_id} has no quoted passage`, section_index: i });
        return;
      }
      if (!normalize(obl.source_text).includes(normalize(c.quote_text))) {
        failures.push({
          rule: 'non_verbatim_quote',
          detail: `quote for ${c.obligation_id} does not appear verbatim in its source`,
          section_index: i,
        });
      }
    });
  });

  return { passed: failures.length === 0, failures };
}

/**
 * Deterministic starting scaffold (no LLM): one section per distinct agent, with
 * that agent's obligations pre-cited by their full source_text. The student edits
 * the prose; the citations already satisfy the guardrail, so drafting starts from a
 * valid state rather than an empty one.
 */
export function draftScaffold(obligationSet: ObligationSetPayload, title = 'Compliance Memorandum'): MemoPayload {
  const byAgent = new Map<string, MemoCitation[]>();
  obligationSet.obligations.forEach((o, i) => {
    const list = byAgent.get(o.agent) ?? [];
    list.push({ obligation_id: obligationId(i), quote_text: o.source_text });
    byAgent.set(o.agent, list);
  });

  const sections: MemoSection[] = [...byAgent.entries()].map(([agent, citations]) => ({
    heading: `Obligations of ${agent}`,
    content: `${agent} is subject to the following obligations identified in the document pack.`,
    citations,
  }));

  return { title, sections };
}

export default validateMemo;
