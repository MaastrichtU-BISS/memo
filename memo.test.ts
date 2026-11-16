/**
 * Tests for the BlueLab memo citation guardrail.
 * Run: npx tsx modules/bl-memo/memo.test.ts
 */
import assert from 'node:assert';
import {
  validateMemo,
  draftScaffold,
  obligationId,
  type ObligationSetPayload,
  type MemoPayload,
} from './memo.ts';

let passed = 0;
const ok = (name: string, fn: () => void) => { fn(); passed++; console.log('  ✓', name); };

const obligationSet: ObligationSetPayload = {
  model: 'dt-tfidf',
  obligations: [
    { agent: 'Member State', deontic_word: 'shall', deontic_type: 'obligation', action: 'establish maritime spatial plans', atomic_statement: 'x', source_chunk_id: 'MSP-ART4-P1', source_text: 'Each Member State shall establish maritime spatial plans.' },
    { agent: 'the undertaking', deontic_word: 'shall', deontic_type: 'obligation', action: 'disclose water consumption', atomic_statement: 'y', source_chunk_id: 'ESRS-E3-4-P26', source_text: 'The undertaking shall disclose water consumption.' },
  ],
};

ok('a memo with a verbatim citation per section passes', () => {
  const memo: MemoPayload = {
    title: 'Memo',
    sections: [
      { heading: 'MS', content: 'The Member State must plan.', citations: [{ obligation_id: 'obl-0', quote_text: 'shall establish maritime spatial plans' }] },
    ],
  };
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, true);
  assert.equal(r.failures.length, 0);
});

ok('a section with no citation fails no_citation', () => {
  const memo: MemoPayload = {
    title: 'Memo',
    sections: [{ heading: 'MS', content: 'Unsupported claim.', citations: [] }],
  };
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, false);
  assert.ok(r.failures.some(f => f.rule === 'no_citation'));
});

ok('a hallucinated (non-verbatim) quote is rejected', () => {
  const memo: MemoPayload = {
    title: 'Memo',
    sections: [
      { heading: 'MS', content: 'x', citations: [{ obligation_id: 'obl-0', quote_text: 'shall fund offshore wind farms' }] },
    ],
  };
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, false);
  assert.ok(r.failures.some(f => f.rule === 'non_verbatim_quote'));
});

ok('a citation to a non-existent obligation fails dangling_citation', () => {
  const memo: MemoPayload = {
    title: 'Memo',
    sections: [
      { heading: 'X', content: 'x', citations: [{ obligation_id: 'obl-9', quote_text: 'anything' }] },
    ],
  };
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, false);
  assert.ok(r.failures.some(f => f.rule === 'dangling_citation'));
});

ok('whitespace differences in the quote still match (normalized)', () => {
  const memo: MemoPayload = {
    title: 'Memo',
    sections: [
      { heading: 'MS', content: 'x', citations: [{ obligation_id: 'obl-0', quote_text: 'shall   establish\n maritime spatial plans' }] },
    ],
  };
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, true);
});

ok('draftScaffold produces a guardrail-valid starting memo', () => {
  const memo = draftScaffold(obligationSet);
  assert.equal(memo.sections.length, 2); // one section per distinct agent
  const r = validateMemo(memo, obligationSet.obligations);
  assert.equal(r.passed, true);
  assert.equal(memo.sections[0].citations[0].obligation_id, obligationId(0));
});

console.log(`\nbl-memo: ${passed} passed`);
