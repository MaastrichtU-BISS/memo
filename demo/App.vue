<template>
  <main class="demo">
    <header class="demo__hero">
      <h1>bl-memo demo</h1>
      <p>Seeds an obligation set, then renders the citation-enforced memorandum screen.</p>
    </header>
    <section v-if="!ready" class="demo__loading">Seeding obligations…</section>
    <section v-else class="demo__screen">
      <MemoPage />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useArtifact } from '@legalblocks/module-runtime'
import MemoPage from '../pages/memo.vue'

const ready = ref(false)

onMounted(async () => {
  const obligationSet = useArtifact('bl-obligation-set')
  await obligationSet.write({
    artifact_type: 'bluelab.obligation_set',
    schema_version: '0.1.0',
    payload: {
      model: 'demo',
      obligations: [
        {
          agent: 'Member State',
          deontic_word: 'shall',
          deontic_type: 'obligation',
          action: 'establish maritime spatial plans',
          atomic_statement: 'Each Member State shall establish maritime spatial plans.',
          source_chunk_id: 'MSP-ART4-P1',
          source_text: 'Each Member State shall establish maritime spatial plans.',
        },
        {
          agent: 'the undertaking',
          deontic_word: 'shall',
          deontic_type: 'obligation',
          action: 'disclose water consumption',
          atomic_statement: 'The undertaking shall disclose water consumption.',
          source_chunk_id: 'ESRS-E3-4-P26',
          source_text: 'The undertaking shall disclose water consumption.',
        },
      ],
    },
    lineage: { produced_by_package: 'bl-memo-demo' },
  })
  ready.value = true
})
</script>

<style scoped>
.demo { max-width: 960px; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; }
.demo__hero h1 { margin: 0 0 4px; }
.demo__hero p { color: #555; margin: 0 0 16px; }
.demo__loading { color: #888; font-style: italic; }
</style>