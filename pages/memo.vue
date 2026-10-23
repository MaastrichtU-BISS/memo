<template>
  <div class="lb-page page-memo">
    <div class="page-header">
      <div class="eyebrow">bluelab · step 5</div>
      <h1 class="serif page-title">Client Memorandum</h1>
      <p class="page-sub mono">Draft each section. A section may not be finalised until it cites a verbatim obligation.</p>
    </div>

    <p v-if="!obligations.length" class="memo-empty mono">No obligations yet. Complete Step 3 first.</p>

    <template v-else>
      <input v-model="title" class="memo-title" placeholder="Memorandum title" />

      <div v-for="(s, si) in sections" :key="si" class="memo-section" :class="{ 'memo-section--bad': sectionBad(si) }">
        <input v-model="s.heading" class="memo-heading" placeholder="Section heading" />
        <textarea v-model="s.content" class="memo-content" rows="3" placeholder="Compliance analysis…"></textarea>

        <div class="memo-cites">
          <span class="eyebrow">citations</span>
          <div v-for="(c, ci) in s.citations" :key="ci" class="memo-cite" :class="{ 'memo-cite--bad': !quoteOk(c) }">
            <span class="memo-cite-id mono">{{ c.obligation_id }}</span>
            <span class="memo-cite-q">“{{ c.quote_text }}”</span>
            <span class="memo-cite-flag mono">{{ quoteOk(c) ? '✓ verbatim' : '⚠ not in source' }}</span>
            <button class="memo-cite-del" @click="s.citations.splice(ci, 1)">✕</button>
          </div>

          <div class="memo-add">
            <select v-model="draft[si].obligation_id" class="memo-sel">
              <option value="">obligation…</option>
              <option v-for="o in obligations" :key="o.id" :value="o.id">{{ o.id }} · {{ o.agent }}: {{ o.action }}</option>
            </select>
            <input v-model="draft[si].quote_text" class="memo-quote" placeholder="paste a verbatim passage from the source" />
            <button class="memo-cite-add" :disabled="!draft[si].obligation_id || !draft[si].quote_text" @click="addCite(si)">cite</button>
          </div>
        </div>
      </div>

      <button class="memo-add-section" @click="addSection">+ section</button>

      <div class="memo-actions">
        <span class="memo-gate mono" :class="{ 'memo-gate--ok': passed }">
          {{ passed ? '✓ every section cited and verbatim' : firstFailure }}
        </span>
        <NuxtLink to="/reflect" class="memo-advance" :class="{ 'memo-advance--off': !passed }">Advance to Reflection →</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useArtifact } from '@legalblocks/module-runtime'

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()

// Artifact I/O goes through the bus. The adapter (localStorage vs an HTTP
// endpoint) is resolved from legalblocks.config.json, never hardcoded here.
const obligationSet = useArtifact('bl-obligation-set')
const memoOut = useArtifact('bl-memo')

// Read obligation_set the upstream module persisted; obligation ids align with Step 4 (obl-N).
let obligationSeed = []
try {
  const env = await obligationSet.read()
  obligationSeed = env?.payload?.obligations ?? []
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[bl-memo] failed to read obligation set', e)
}
const obligations = ref(obligationSeed.map((o, i) => ({ ...o, id: `obl-${i}` })))

const byId = computed(() => Object.fromEntries(obligations.value.map(o => [o.id, o])))

const title = ref('Compliance Memorandum')
const sections = ref([{ heading: 'Obligations', content: '', citations: [] }])
const draft = reactive({ 0: { obligation_id: '', quote_text: '' } })

function quoteOk(c) {
  const o = byId.value[c.obligation_id]
  return !!o && norm(o.source_text).includes(norm(c.quote_text)) && !!norm(c.quote_text)
}
function sectionBad(si) {
  const s = sections.value[si]
  return !norm(s.content) || s.citations.length === 0 || s.citations.some(c => !quoteOk(c))
}
function addCite(si) {
  const d = draft[si]
  sections.value[si].citations.push({ obligation_id: d.obligation_id, quote_text: d.quote_text })
  draft[si] = { obligation_id: '', quote_text: '' }
  persist()
}
function addSection() {
  sections.value.push({ heading: '', content: '', citations: [] })
  draft[sections.value.length - 1] = { obligation_id: '', quote_text: '' }
}

const passed = computed(() => sections.value.length > 0 && sections.value.every((_, si) => !sectionBad(si)))
const firstFailure = computed(() => {
  const si = sections.value.findIndex((_, i) => sectionBad(i))
  if (si < 0) return ''
  const s = sections.value[si]
  if (!norm(s.content)) return `section ${si + 1} has no content`
  if (s.citations.length === 0) return `section ${si + 1} cites no obligation`
  return `section ${si + 1} has a non-verbatim citation`
})

let persistTimer = null
function persist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    memoOut.write({
      artifact_type: 'bluelab.memo',
      schema_version: '0.1.0',
      payload: { title: title.value, sections: sections.value },
      lineage: { produced_by_package: 'bluelab.memo', produced_by_module: 'memoDraft' },
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[bl-memo] failed to persist memo', e)
    })
  }, 300)
}
watch([title, sections], persist, { deep: true })
</script>

<style scoped>
.page-memo { max-width: 860px; margin: 0 auto; padding: 36px 24px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 28px; font-weight: 400; margin: 6px 0 0; color: var(--ink); }
.page-sub { font-size: 11px; color: var(--muted); margin: 8px 0 0; }
.memo-empty { font-size: 12px; color: var(--muted); }

.memo-title { width: 100%; font-size: 18px; font-weight: 600; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 14px; color: var(--ink); }
.memo-section { background: var(--white); border: 1px solid var(--line); border-left: 3px solid #5F7A3A; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.memo-section--bad { border-left-color: #B6371A; }
.memo-heading { width: 100%; font-size: 14px; font-weight: 600; padding: 7px 9px; border: 1px solid var(--line-2); border-radius: 6px; margin-bottom: 8px; }
.memo-content { width: 100%; font-size: 13px; padding: 8px 9px; border: 1px solid var(--line-2); border-radius: 6px; font-family: inherit; resize: vertical; }

.memo-cites { margin-top: 10px; }
.memo-cite { display: grid; grid-template-columns: 60px 1fr auto 24px; gap: 10px; align-items: center; padding: 6px 10px; background: var(--cream); border-radius: 6px; font-size: 12px; margin-top: 6px; }
.memo-cite--bad { background: #FDE8E0; }
.memo-cite-id { font-size: 10px; color: var(--muted); }
.memo-cite-q { color: var(--ink-2); font-style: italic; }
.memo-cite-flag { font-size: 10px; color: #5F7A3A; }
.memo-cite--bad .memo-cite-flag { color: #B6371A; }
.memo-cite-del { border: none; background: none; cursor: pointer; color: var(--muted); }
.memo-add { display: flex; gap: 8px; margin-top: 8px; }
.memo-sel { flex: 0 0 auto; max-width: 320px; font-size: 12px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; }
.memo-quote { flex: 1; font-size: 12px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; }
.memo-cite-add { font-size: 12px; font-weight: 600; padding: 6px 14px; border: none; border-radius: 6px; background: var(--vermillion); color: #fff; cursor: pointer; }
.memo-cite-add:disabled { opacity: 0.4; cursor: not-allowed; }

.memo-add-section { font-size: 12px; padding: 7px 14px; border: 1px dashed var(--line); border-radius: 6px; background: none; color: var(--ink-2); cursor: pointer; margin-bottom: 18px; }
.memo-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.memo-gate { font-size: 11px; color: var(--muted); }
.memo-gate--ok { color: #5F7A3A; }
.memo-advance { background: var(--vermillion); color: #fff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 9px 18px; border-radius: 8px; }
.memo-advance--off { pointer-events: none; opacity: 0.4; }
</style>
