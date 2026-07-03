import { useState, useEffect } from 'react'
import FlowCanvas from './FlowCanvas.jsx'

// ═══════════════════════════════════════════════════════════════════════════
// hl-subaccount-setup — Workflow Builder React app (TEMPLATE, not a client deliverable)
//
// This file is copied per-client into hl-subaccount-config-v{N}/react-app/ and
// customized during Stage 1 Phase E3 (see SKILL.md). Two kinds of content below:
//
// 1. PIPELINE / GHL_ACCOUNTS — fill these [PLACEHOLDER] tokens from the same
//    values used in Sprint_Dashboard.html (brand name, colors, location ID,
//    the 5 pipeline stage names from research/03_Configuration_Extract.md).
//    Every buildWorkflowN function below reads stage names from `p.stages.*`,
//    so editing PIPELINE once cascades everywhere — don't hardcode stage name
//    strings inside the builder functions.
//
// 2. buildWorkflow1..13 — the trigger/action NODE TYPES, the real GHL
//    vocabulary, the workflow STRUCTURE (single vs. multi-trigger chains),
//    and the visual panel previews (Ghl*Preview components below) are all
//    verified against official help.gohighlevel.com docs AND real screenshots
//    from a live GHL account in production ("Bikans - Asesores Contables y
//    Financieros", a different, unrelated client — used only to confirm
//    platform behavior, never to copy its data; last verification pass:
//    2026-07). Keep
//    these as-is, don't restructure without re-checking against a real panel.
//    Notably:
//      - WF1/WF2 (bot books appointment / bot disqualifies) have NO native
//        trigger — confirmed with a real screenshot that these are invoked
//        directly by the bot's own action, not by a calendar/tag trigger.
//        Don't add a "Customer Booked Appointment" trigger here.
//      - "Opportunity Changed" (not "Pipeline Stage Changed") is the trigger
//        actually used in production for stage-reaction workflows (DQ, lost,
//        won, stale), filtered by "In pipeline" + "Pipeline stage" (or
//        "Estado"/Status for status-based reactions). Confirmed with real
//        screenshots across 6+ workflows — "Pipeline Stage Changed" is a
//        real trigger too, just not the one actually used in the reference.
//      - Facebook has TWO distinct real actions, don't conflate them:
//        "Facebook - Añadir a público personalizado" (Custom Audience, for
//        retargeting) vs. "Facebook Conversion API" (Conversion event with
//        value, e.g. Purchase/Lead). A "Won" workflow typically uses BOTH.
//      - Facebook Conversion API has 2 real connection modes: "Integración"
//        (manual Token de Acceso + ID del conjunto de datos, confirmed as
//        the one actually in use) vs. "Administrador de Anuncios" (Ad
//        Manager, no manual token). Support both, default the example to
//        Integración since that's the verified real-world case.
//      - "Update conversation AI bot and status" IS a real workflow action
//        (confirmed with screenshot) — not just something inside the bot's
//        own settings. Use it (fields: bot to assign, status, reactivate
//        after) instead of a generic "Stop Bot" placeholder.
//      - "Create/Update Opportunity" combined action: help docs call the
//        older combined version deprecated, but a real production account
//        still uses it as a single action (with a "Campos" section that
//        maps custom fields) — this is what real WF8-style "duplicate
//        contact info to opportunity" workflows use, not two separate
//        "Update Opportunity Field" actions.
//      - "Appointment Status" (filtered by status=confirmed + calendar) is
//        the real trigger for appointment reminders — not "Customer Booked
//        Appointment". Pair it with a "Wait" step in "Until a scheduled
//        date/time" → "Appointment/calendar event" → "Before" mode.
//      - "Scheduler" is CONTACTLESS (doesn't enroll a contact, skips any
//        step that needs one) — never use it for per-contact reminders.
//      - An If/Else CANNOT wait for a future event different from the one
//        that fired the current run. Two things that happen at different
//        times need two parallel trigger chains in the same workflow
//        (buildWorkflowN returns Node[][], one array per trigger chain —
//        see flattenChains/WorkflowView), not a nested condition.
//      - A "Wait" step in "Until the contact replies" mode has a NATIVE
//        two-way branch built in (Contact reply / Time out) — confirmed
//        with a real, deeply-nested multi-cycle follow-up sequence. Model
//        this with the same `condition`-style yes/no node shape used for
//        If/Else (yesLabel/noLabel = 'Contact reply →'/'Time out →'), don't
//        build a separate If/Else after the Wait to fake the branch.
//      - A "Condition"/"Fork" action supports N NAMED branches, not just
//        Sí/No — confirmed with a real 3-way fork keyed off "Workflow
//        trigger" (which of several merged triggers fired). Model this with
//        `node.branches: [{ label, nodes }]` (NodeCard/flattenNodes read
//        both `branches` and the legacy `yes`/`no` shape — see
//        getBranchList). Use it whenever a workflow merges 2+ triggers into
//        one flow and needs to react differently per source.
//      - "Assign User" (round-robin across 2+ users, with an "only apply to
//        unassigned contacts" toggle) and "Add Owner to Opportunity" (syncs
//        the contact's assigned user onto the new opportunity) are real
//        actions confirmed with screenshot — used together in lead-creation
//        workflows that need to distribute new leads across a sales team.
//      - "Add to Google Ads" real UI uses a dropdown of pre-configured
//        Conversion names, not free text — the conversion must already
//        exist in the client's Google Ads account.
//      - "sms" (WhatsApp/SMS) node type still uses the generic key:value
//        table — the real panel layout isn't documented publicly, unlike
//        the other types which have a dedicated Ghl*Preview component.
//    What you MUST still replace per client: field keys
//    (research/03_Configuration_Extract.md), tag names (artifacts/11_Tags_Map.html),
//    WhatsApp template names (artifacts/08_WhatsApp_Templates.html), and any
//    bot/brand name strings. The current values are Max Gym's (a past client)
//    kept as a concrete, already-correct example — not literal fallback data.
//
// ⚠️ Before registering a GHL account to test any of this live, ALWAYS ask the
// user for their Location ID + Private Integration Token first and register it:
//   python3 ~/.claude/skills/ghl-api/scripts/accounts.py add [ACCOUNT_NAME] --location-id [LOCATION_ID] --token <PAT>
//   python3 ~/.claude/skills/ghl-api/scripts/accounts.py test [ACCOUNT_NAME]
// Never assume an account is already registered — GHL_ACCOUNTS below only
// declares what the UI *shows*, it doesn't register anything with ghl-api.
//
// ⚠️ Trigger/action names are verified against ENGLISH help.gohighlevel.com
// docs. The real GHL UI can show different strings depending on account
// settings (confirmed: a Spanish-configured account showed "Contacto tag" /
// "Contacto created" instead of "Contact Tag"/"Contact Created" in the
// trigger picker) — see rules/workflows.md for what's confirmed vs. not.
// ═══════════════════════════════════════════════════════════════════════════

const PIPELINE = {
  name: 'Membresías — Max Gym',
  id: 'E2BZtnk9wlulIffCO5N6',
  stages: {
    newLead:    { name: 'Nuevo Lead',          id: 'stage_1' },
    tour:       { name: 'Tour / Visita Agendada', id: 'stage_2' },
    prospect:   { name: 'Prospecto',           id: 'stage_3' },
    memberSigned: { name: 'Miembro Firmado',   id: 'stage_4' },
    active:     { name: 'Miembro Activo',      id: 'stage_5' },
    lost:       { name: 'Perdido / Descalificado', id: 'stage_lost' },
  },
  brandColor: '#87f24d',
  brandName: 'Max Gym',
  locationId: 'E2BZtnk9wlulIffCO5N6',
}

const GHL_ACCOUNTS = [
  { name: 'max_gym', label: 'Max Gym Agency', locationId: 'E2BZtnk9wlulIffCO5N6' },
]

// Contenido real de cada template — copiado 1:1 de artifacts/08_WhatsApp_Templates.html
// (fuente de verdad: research/05_Email_Templates.md y el mismo artifact). Se
// usa en GhlSmsPreview para mostrar el mensaje real, no solo el nombre.
const WHATSAPP_TEMPLATES = {
  bienvenida_max_gym: {
    category: 'Marketing',
    body: `¡Hola! 👋 Gracias por tu interés en Max Gym 💪
Estamos en Costa del Este. Contamos con área de pesas, salón de crosstraining y clases grupales.
Nuestros entrenadores de planta te orientan, hacen una valoración inicial y te asignan una rutina general en la app.
El sauna está incluido.
Entrenamiento personalizado, nutrición, fisioterapia, cafetería y tienda de suplementos tienen costo adicional.
🕔 Lun–Vie 5:00 a.m.–12:00 m | Fines de semana 8:00 a.m.–4:00 p.m.
👉 ¿Qué objetivos tienes con tu entrenamiento?`,
  },
  recordatorio_visita_24h: {
    category: 'Utility',
    body: `¡Hola {{1}}! 💚

Te recordamos que mañana tenemos tu tour en Max Gym:
🕐 {{2}}
📍 Plaza del Super 99, Nivel 1, Costa del Este

¿Todo bien? Si necesitas reprogramar, avísanos con confianza.
¡Te esperamos! 💪`,
  },
  seguimiento_72_horas: {
    category: 'Marketing',
    body: `¡Hola {{1}}! 💚

Hace unos días conversamos sobre tus objetivos en el gym.
¿Te quedó alguna duda sobre Max Gym o los planes?

Recuerda que puedes venir a conocernos sin compromiso.
Una visita y te llevas una valoración InBody incluida.

¿Qué te parece?`,
  },
  seguimiento_5_dias: {
    category: 'Marketing',
    body: `¡Hola {{1}}! 💪

Sé que elegir un gym es una decisión importante.
En Max Gym no solo encuentras máquinas de primera — encuentras
una comunidad que te impulsa a dar lo mejor de ti.

Te recuerdo que tenemos:
🏋️ Máquinas que no existen en otro gym de Panamá
⏰ Abierto 5am–12am
🧖 Sauna incluido
🅿️ Parqueo gratis

¿Te gustaría pasar a conocer esta semana?`,
  },
  seguimiento_15_dias: {
    category: 'Marketing',
    body: `¡Hola {{1}}! 💚

Han pasado unos días y quería saber si todavía están vigentes
tus ganas de empezar a entrenar. La invitación a conocernos
sigue en pie — sin compromiso, sin presiones.

Cuando quieras, aquí estamos.
Un abrazo,
— Equipo Max Gym`,
  },
}

function buildWorkflow1(p) {
  // Confirmado con screenshots reales de una cuenta en producción: este
  // workflow NO tiene trigger nativo configurado — lo invoca directo la
  // acción "appointment booking" del AI Agent bot (ver 05_AI_Agent_Actions.html),
  // sin pasar por un trigger de calendario tipo "Customer Booked Appointment".
  // ⚠️ NO es 1:1: la referencia real (Bikans) es literalmente 1 solo nodo
  // (Update Opportunity) después del trigger. Los nodos 'tag' y 'notify' de
  // acá son un agregado propio para Max Gym (tracking + aviso al equipo), no
  // algo confirmado contra el screenshot — sí son acciones reales de GHL,
  // pero no están en la referencia.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Sin trigger nativo — invocado directo por el bot', fields: [{ k: 'Cómo se dispara', v: 'La acción "appointment booking" del AI Agent bot ejecuta este workflow directamente al agendar el tour (no hace falta un trigger de calendario)' }] },
      { type: 'opp', color: '#f0883e', bg: 'var(--warning-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Pipeline', v: p.name }, { k: 'Stage', v: p.stages.tour.name }, { k: 'Opportunity Name', v: '{{contact.name}}' }, { k: 'Status', v: 'Open' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags (agregado, no está en la referencia)', fields: [{ k: 'Add Tags', v: 'meeting-scheduled, ia-qualified' }, { k: 'Remove Tags', v: 'ia-qualifying' }] },
      { type: 'notify', color: '#39d353', bg: 'var(--success-tint)', title: '🔔 Internal Notification (agregado, no está en la referencia)', fields: [{ k: 'Channel', v: 'Email' }, { k: 'Message', v: '{{contact.name}} agendó tour vía IA' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow2(p) {
  // Mismo patrón confirmado: sin trigger nativo, lo invoca el bot directo al
  // disparar STOPBOT_DESCALIFICADO (rules/conversation-ai.md). El TIPO A-F
  // exacto viene del flujo aprobado (research/02_Conversation_Flow_Final.md).
  // ⚠️ NO es 1:1: la referencia real es Update Opportunity → Remove from
  // Workflow → END (2 nodos). El 'tag' de acá es agregado propio, no
  // confirmado contra el screenshot.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Sin trigger nativo — invocado directo por el bot', fields: [{ k: 'Cómo se dispara', v: 'STOPBOT_DESCALIFICADO ejecuta este workflow directamente al confirmar cualquier TIPO A–F' }] },
      { type: 'opp', color: '#f85149', bg: 'var(--danger-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Stage', v: p.stages.lost.name }, { k: 'Status', v: 'Lost' }, { k: 'Loss Reason', v: 'Según TIPO A–F — ver research/03_Configuration_Extract.md' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags (agregado, no está en la referencia)', fields: [{ k: 'Add Tags', v: 'ia-disqualified, stop-bot, dq-[tipo]' }] },
      { type: 'removewf', color: '#a371f7', bg: 'var(--purple-tint)', title: '🗑 Remove from Workflow', fields: [{ k: 'Workflow', v: 'Otro flujo de trabajo' }, { k: 'Select Workflows', v: 'Seguimiento por inactividad (72h)' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow3(p) {
  // Trigger real confirmado: "Opportunity Changed" ("La oportunidad ha
  // cambiado") filtrado por pipeline + stage — no "Pipeline Stage Changed"
  // como asumí antes de tener el screenshot real.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Opportunity Changed', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'In pipeline', v: p.name }, { k: 'Pipeline stage', v: p.stages.lost.name }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'disqualified, lost' }] },
      { type: 'opp', color: '#f85149', bg: 'var(--danger-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Status', v: 'Lost' }] },
      { type: 'removewf', color: '#a371f7', bg: 'var(--purple-tint)', title: '🗑 Remove from Workflow', fields: [{ k: 'Workflow', v: 'Otro flujo de trabajo' }, { k: 'Select Workflows', v: 'Seguimiento por inactividad (72h)' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow4(p) {
  // Corrección importante: el screenshot real muestra que "envío info a
  // pixel" en este workflow es una acción "Facebook - Añadir a público
  // personalizado" (retargeting), NO Facebook Conversion API — esa es la
  // que sí se usa en WF6 (ver más abajo).
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Opportunity Changed', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'In pipeline', v: p.name }, { k: 'Pipeline stage', v: p.stages.lost.name }] },
      { type: 'opp', color: '#f85149', bg: 'var(--danger-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Status', v: 'Lost' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'disqualified' }] },
      { type: 'fbaudience', color: '#1877f2', bg: '#0a1f38', title: '📘 Facebook — Añadir a público personalizado', fields: [{ k: 'Facebook Account', v: `${p.brandName} Ads` }, { k: 'Audience', v: 'Leads descalificados' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow5(p) {
  // "Stale Opportunities" es por-pipeline-y-por-stage (un valor cada uno) — para
  // cubrir 2 stages hacen falta 2 triggers "Stale Opportunities" en el mismo
  // workflow, cada uno con su propia cadena de acciones (no un Scheduler
  // contactless con condiciones manuales — Scheduler no enrola contactos y
  // saltea cualquier paso que dependa de uno).
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Stale Opportunities', fields: [{ k: 'Trigger Type', v: 'Stale Opportunities' }, { k: 'Pipeline', v: p.name }, { k: 'Stage', v: p.stages.newLead.name }, { k: 'Stale after', v: '14 días sin avance en la etapa' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'cold, nurturing' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Stale Opportunities', fields: [{ k: 'Trigger Type', v: 'Stale Opportunities' }, { k: 'Pipeline', v: p.name }, { k: 'Stage', v: p.stages.tour.name }, { k: 'Stale after', v: '14 días sin avance en la etapa' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'cold, nurturing' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow6(p) {
  // Confirmado con screenshot real: al ganar, se usan DOS acciones de
  // Facebook distintas — Custom Audience (retargeting de clientes) Y
  // Conversion API (evento de venta con valor) — no solo una.
  // ⚠️ NO es 1:1 completo: la referencia real termina en el nodo de
  // Facebook Conversion API (tag → opp → fbaudience → http → END, 4 nodos).
  // 'notify', 'sms' y 'task' de acá son onboarding agregado para Max Gym, no
  // confirmados contra el screenshot.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Opportunity Changed', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'In pipeline', v: p.name }, { k: 'Pipeline stage', v: p.stages.memberSigned.name }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'won, onboarding-start' }, { k: 'Remove Tags', v: 'meeting-scheduled, ia-qualified' }] },
      { type: 'opp', color: '#f0883e', bg: 'var(--warning-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Status', v: 'Won' }] },
      { type: 'fbaudience', color: '#1877f2', bg: '#0a1f38', title: '📘 Facebook — Añadir a público personalizado', fields: [{ k: 'Facebook Account', v: `${p.brandName} Ads` }, { k: 'Audience', v: `Clientes ${p.brandName}` }] },
      { type: 'http', color: '#58a6ff', bg: 'var(--info-tint)', title: '🌐 Facebook Conversion API', fields: [{ k: 'Connection Type', v: 'Integración' }, { k: 'Event Type', v: 'Funnel Event' }, { k: 'Event', v: 'Purchase' }, { k: 'Value', v: '{{opportunity.proposal_value}}' }, { k: 'Currency', v: 'USD' }] },
      { type: 'notify', color: '#39d353', bg: 'var(--success-tint)', title: '🔔 Internal Notification (agregado, no está en la referencia)', fields: [{ k: 'Channel', v: 'Email' }, { k: 'Message', v: '🎉 {{contact.name}} se inscribió!' }] },
      { type: 'sms', color: '#58a6ff', bg: 'var(--info-tint)', title: '💬 Send Thank You Message (agregado, no está en la referencia)', fields: [{ k: 'Template', v: 'bienvenida_max_gym' }, { k: 'To', v: '{{contact.phone}}' }] },
      { type: 'task', color: '#f0883e', bg: 'var(--warning-tint)', title: '☑ Create Task (agregado, no está en la referencia)', fields: [{ k: 'Title', v: 'Llamada de bienvenida — {{contact.name}}' }, { k: 'Assign To', v: 'Dorayme Triana' }, { k: 'Due Date', v: '+1 Day' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow7(p) {
  // Corrección (auditoría 2026-07): había inventado un If/Else acá que NO
  // existe en la referencia real — Bikans WF7 es lineal, sin condición,
  // igual de simple que WF3. También le faltaba el "Remove from Workflow"
  // que sí tiene el screenshot real. Estructura ahora 1:1 real: tag → Update
  // Opportunity (Status Lost) → Remove from Workflow → END.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Opportunity Changed', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'In pipeline', v: p.name }, { k: 'Pipeline stage', v: p.stages.lost.name }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'lost' }] },
      { type: 'opp', color: '#f85149', bg: 'var(--danger-tint)', title: '💼 Update Opportunity', fields: [{ k: 'Status', v: 'Lost' }] },
      { type: 'removewf', color: '#a371f7', bg: 'var(--purple-tint)', title: '🗑 Remove from Workflow', fields: [{ k: 'Workflow', v: 'Otro flujo de trabajo' }, { k: 'Select Workflows', v: 'Seguimiento por inactividad (72h)' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow8(p) {
  // Corrección importante: el screenshot real muestra UNA sola acción
  // "Crear o actualizar oportunidad" (combinada) que ya incluye el mapeo de
  // campos personalizados — no dos "Update Opportunity Field" separados.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Contact Changed', fields: [{ k: 'Trigger Type', v: 'Contact Changed' }, { k: 'Filters', v: 'Ninguno' }] },
      { type: 'opp', color: '#f0883e', bg: 'var(--warning-tint)', title: '💼 Create/Update Opportunity', fields: [{ k: 'Pipeline', v: p.name }, { k: 'Stage', v: p.stages.newLead.name }, { k: 'Opportunity Source', v: '{{contact.source}}' }, { k: 'Lead Value', v: '{{contact.presupuesto}}' }, { k: 'Status', v: 'Open' }, { k: 'Custom Fields', v: 'objetivo_principal, situacion_actual (mapeados desde el contacto)' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow9(p) {
  // Corrección importante: el trigger real confirmado es "Appointment
  // Status" filtrado por status=confirmed + calendario específico — no
  // "Customer Booked Appointment". El Wait real usa "Until a scheduled
  // date/time" → "Appointment/calendar event" → "Before" con fallback
  // "Skip all outbound communication actions till next wait or event start".
  // ⚠️ Casi 1:1: la referencia real termina justo después del WhatsApp
  // "RECORDATORIO" (trigger → wait → sms → END). El 'tag' final de acá es
  // agregado propio (evita reenvíos duplicados), no está en la referencia.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Appointment Status', fields: [{ k: 'Trigger Type', v: 'Appointment Status' }, { k: 'Who should be enrolled', v: 'Contact and guests' }, { k: 'Event type', v: 'Normal' }, { k: 'Appointment status is', v: 'confirmed' }, { k: 'In calendar', v: 'Tour / Visita de Instalaciones — Max Gym' }] },
      { type: 'wait', color: '#d29922', bg: '#271d04', title: '⏱ Esperar 30 min antes del tour', fields: [{ k: 'Selected wait type', v: 'Until a scheduled date/time' }, { k: 'What type', v: 'Appointment / calendar event' }, { k: 'When should contact proceed', v: 'Before — 30 minutes' }, { k: 'If date already passed', v: 'Skip all outbound communication actions till next wait or event start action' }] },
      { type: 'sms', color: '#58a6ff', bg: 'var(--info-tint)', title: '💬 RECORDATORIO', fields: [{ k: 'Template', v: 'recordatorio_visita_24h' }, { k: 'Variables', v: '{{1}}={{contact.first_name}}, {{2}}={{appointment.start_time}}' }] },
      { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tag (agregado, no está en la referencia)', fields: [{ k: 'Tag', v: 'meeting-reminder-sent' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

function buildWorkflow10(p) {
  // Corrección: "Update conversation AI bot and status" es una acción real
  // de workflow (confirmada con screenshot), no algo que solo se configura
  // adentro del bot — la uso en vez de un Update Contact Field genérico.
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Opportunity Changed', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'Estado', v: 'Ha cambiado a "Lost"' }] },
      { type: 'aibot', color: '#39d353', bg: 'var(--success-tint)', title: '🤖 Update Conversation AI Bot and Status', fields: [{ k: 'Bot', v: `Agente IA — ${p.brandName}` }, { k: 'Status', v: 'Inactive' }] },
      { type: 'removewf', color: '#a371f7', bg: 'var(--purple-tint)', title: '🗑 Remove from Workflow', fields: [{ k: 'Workflow', v: 'Otro flujo de trabajo' }, { k: 'Select Workflows', v: 'Seguimiento por inactividad (72h)' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

// Cada ciclo: WhatsApp → Email → Task → Wait "Until the contact replies"
// (con timeout) → rama nativa Contact reply / Time out. Esto es un patrón
// real confirmado con screenshot (no un If/Else genérico) — GHL arma la
// bifurcación reply-vs-timeout adentro del propio nodo Wait cuando el modo
// es "Until the contact replies".
function buildFollowupCycle(p, { day, waTemplate, emailSubject, timeoutDays, nextCycle }) {
  return [
    { type: 'sms', color: '#58a6ff', bg: 'var(--info-tint)', title: `💬 WhatsApp seguimiento (${day})`, fields: [{ k: 'Select from phone number', v: '+507 6535-1411' }, { k: 'Template', v: waTemplate }, { k: 'Wait for delivery status', v: 'On — retiene al contacto hasta que Meta confirme la entrega' }] },
    { type: 'sms', color: '#39d353', bg: 'var(--success-tint)', title: `✉️ Email seguimiento (${day})`, fields: [{ k: 'Desde el nombre', v: 'Dorayme, Max Gym' }, { k: 'Desde el correo', v: 'info@maxgym.com.pa' }, { k: 'Asunto', v: emailSubject }] },
    { type: 'task', color: '#f0883e', bg: 'var(--warning-tint)', title: `☑ Tarea: comunicarse con prospecto (${day})`, fields: [{ k: 'Título', v: 'Comunicarse con prospecto {{contact.name}}' }, { k: 'Asignar a', v: "Contact's Assigned User" }, { k: 'Fecha de vencimiento', v: '1 día, 5:00 PM' }] },
    {
      type: 'condition', color: '#bc8cff', bg: 'var(--purple-tint)', title: '⏱ Esperar', subtitle: `Until the contact replies (timeout ${timeoutDays})`,
      fields: [{ k: 'Tipo de espera seleccionado', v: 'Until the contacto replies' }, { k: 'Responder a', v: `WhatsApp seguimiento (${day})` }, { k: 'Tiempo de espera agotado', v: `On — ${timeoutDays}` }],
      yesLabel: 'Contact reply →', noLabel: 'Time out →',
      yes: [
        { type: 'notify', color: '#39d353', bg: 'var(--success-tint)', title: '🔔 Avisar que lead respondió', fields: [{ k: 'Channel', v: 'In-App' }, { k: 'Title', v: 'Lead respondió al seguimiento' }, { k: 'Message', v: '{{contact.first_name}} ha respondido al seguimiento, prestale atención' }, { k: 'Redirect page', v: 'Conversación' }] },
        { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
      ],
      no: nextCycle || [{ type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Tag: poco interés', fields: [{ k: 'Tags', v: 'cold, no-reply' }] }, { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] }],
    },
  ]
}

function buildWorkflow11(p) {
  const cycle3 = buildFollowupCycle(p, { day: 'Día 15', waTemplate: 'seguimiento_15_dias', emailSubject: '3 tips para arrancar tu transformación', timeoutDays: '6 días', nextCycle: null })
  const cycle2 = buildFollowupCycle(p, { day: 'Día 7', waTemplate: 'seguimiento_5_dias', emailSubject: 'Historias de miembros Max Gym 💪', timeoutDays: '8 días', nextCycle: cycle3 })
  const cycle1 = buildFollowupCycle(p, { day: '72h', waTemplate: 'seguimiento_72_horas', emailSubject: '¿Seguís interesado en conocer Max Gym?', timeoutDays: '5 días', nextCycle: cycle2 })
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER', subtitle: 'Contacto tag: ia-qualifying', fields: [{ k: 'Trigger Type', v: 'Contacto tag' }, { k: 'Tag', v: 'ia-qualifying' }] },
      { type: 'condition', color: '#bc8cff', bg: 'var(--purple-tint)', title: '🔀 IF / ELSE', subtitle: '"stop-bot" tag NOT present?',
        fields: [{ k: 'Condition Type', v: 'Contacto tag' }, { k: 'Tag', v: 'stop-bot' }, { k: 'Check', v: 'NOT present' }],
        yesLabel: 'YES →', noLabel: 'NO →',
        yes: cycle1,
        no: [{ type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ Bot stopped — no action', fields: [] }],
      },
    ],
  ]
}

// Confirmado con screenshot real (Bikans WF12 "Creación Negocio Leads
// Contabilidad"): 3 triggers reales se mergean en un único flujo, que
// bifurca con un Fork/Condition de N ramas NOMBRADAS (no un If/Else
// binario) según cuál trigger disparó la corrida — cada rama corre casi la
// misma secuencia con su propio tag de origen. Reconstruido acá con las 3
// fuentes reales de Max Gym (WhatsApp, Website, Facebook Ads).
function buildWorkflow12(p) {
  // Secuencia completa confirmada con screenshot real (11 actions por rama,
  // no 6 como en una primera pasada) — agrega bienvenida por WhatsApp, tarea
  // de contacto inicial, llamada manual y score de interacción, además de lo
  // ya confirmado (tag, assign, bot, create opp, owner sync). Templates y
  // fields son los reales de Max Gym (08_WhatsApp_Templates.html,
  // 03_Custom_Fields_Table.html), no los de la cuenta de referencia.
  const commonSteps = (sourceTag, sourceLabel) => [
    { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: '🏷 Add Tags', fields: [{ k: 'Add Tags', v: 'new-lead' }] },
    { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: `🏷 Add Tag — ${sourceLabel}`, fields: [{ k: 'Add Tags', v: sourceTag }] },
    { type: 'assignuser', color: '#58a6ff', bg: 'var(--info-tint)', title: '👤 Assign User', fields: [{ k: 'Users', v: 'Dorayme Triana (agregar más para round-robin)' }, { k: 'Only Apply to Unassigned', v: 'On' }] },
    { type: 'aibot', color: '#39d353', bg: 'var(--success-tint)', title: '🤖 Update Conversation AI Bot and Status', fields: [{ k: 'Bot', v: `${p.brandName} Sales Bot` }, { k: 'Status', v: 'Active' }] },
    { type: 'opp', color: '#f0883e', bg: 'var(--warning-tint)', title: '💼 Create Opportunity', fields: [{ k: 'Pipeline', v: p.name }, { k: 'Stage', v: p.stages.newLead.name }, { k: 'Stage ID', v: p.stages.newLead.id, mono: true }, { k: 'Duplicate opportunity', v: 'Enabled' }] },
    { type: 'ownersync', color: '#a371f7', bg: 'var(--purple-tint)', title: '🔗 Add Owner to Opportunity', fields: [{ k: 'User', v: 'Dorayme Triana' }, { k: 'Only Apply to Unassigned Opportunities', v: 'On' }] },
    { type: 'followers', color: '#a371f7', bg: 'var(--purple-tint)', title: '👥 Add Contact Followers', fields: [{ k: 'Followers', v: 'Dorayme Triana' }] },
    { type: 'notify', color: '#39d353', bg: 'var(--success-tint)', title: '🔔 Aviso al comercial', fields: [{ k: 'Channel', v: 'In-App' }, { k: 'Message', v: `Llegó un nuevo lead de ${p.brandName}, atendelo` }, { k: 'Redirect page', v: 'Opportunity' }] },
    { type: 'sms', color: '#58a6ff', bg: 'var(--info-tint)', title: '💬 Bienvenida por WhatsApp', fields: [{ k: 'Template', v: 'bienvenida_max_gym' }, { k: 'To', v: '{{contact.phone}}' }] },
    { type: 'task', color: '#f0883e', bg: 'var(--warning-tint)', title: '☑ Tarea de contacto inicial', fields: [{ k: 'Title', v: '#1 Tarea de contacto inicial — {{contact.name}}' }, { k: 'Assign To', v: 'Dorayme Triana' }] },
    { type: 'manualcall', color: '#39d353', bg: 'var(--success-tint)', title: '📞 Llamar al lead', fields: [{ k: 'Action Name', v: 'Llamar al lead' }] },
    { type: 'engagementscore', color: '#d29922', bg: '#271d04', title: '⭐ Puntaje de interacción', fields: [{ k: 'Adjustment', v: 'Add' }, { k: 'Points', v: '2' }] },
    { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
  ]
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 1', subtitle: 'Customer replied (WhatsApp)', fields: [{ k: 'Trigger Type', v: 'Customer replied' }, { k: 'Reply channel', v: 'WhatsApp' }, { k: 'Workflow trigger name', v: 'Whatsapp' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 2 (mismo workflow)', subtitle: 'Form submitted', fields: [{ k: 'Trigger Type', v: 'Form submitted' }, { k: 'Form is', v: `Leads - ${p.brandName} general` }, { k: 'Workflow trigger name', v: 'Envío de formulario' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 3 (mismo workflow)', subtitle: 'Facebook lead form submitted', fields: [{ k: 'Trigger Type', v: 'Facebook lead form submitted' }, { k: 'Page is', v: `${p.brandName} Ads` }, { k: 'Form is', v: 'Formulario de Captación' }, { k: 'Workflow trigger name', v: 'Formulario De Captación De Clientes Potenciales De Facebook' }] },
      {
        type: 'condition', color: '#bc8cff', bg: 'var(--purple-tint)', title: '🔀 Fork — según qué trigger disparó', subtitle: '"Workflow trigger" is ...',
        fields: [{ k: 'Action Type', v: 'Condition (Fork the Contact journey through this workflow based on conditions)' }],
        branches: [
          { label: 'Formulario LP → (Envío de formulario)', nodes: commonSteps('source-website', 'Formulario Landing Page') },
          { label: 'Formulario Meta → (Facebook lead form)', nodes: commonSteps('source-facebook-ads', 'Formulario Meta') },
          { label: 'None branch → (Whatsapp, fallback)', nodes: commonSteps('source-whatsapp', 'Whatsapp') },
        ],
      },
    ],
  ]
}

// Confirmado con screenshot real: este workflow existe en la cuenta de
// referencia marcado [BORRADOR] (Publish=OFF) — 5 triggers reales mergeados
// en un Fork de 6 ramas por "Workflow trigger", cada rama con su propia
// conversión de Google Ads + tag de canal. Al ser un borrador no publicado
// ni siquiera en la cuenta original, se replica la ESTRUCTURA (confirmada
// real) pero los nombres de conversión son placeholders — hay que crearlos
// en Google Ads antes de que el dropdown los muestre (ver NODE_HOWTO.gads).
function buildWorkflow13(p) {
  const channelStep = (channelName, conversionName, tag) => [
    { type: 'gads', color: '#58a6ff', bg: 'var(--info-tint)', title: `🌐 Add to Google Ads — ${channelName}`, fields: [{ k: 'Conversion Event', v: `${conversionName} (crear primero en Google Ads)` }, { k: 'Currency', v: 'USD' }, { k: 'Conversion Value', v: '1' }] },
    { type: 'tag', color: '#3fb950', bg: 'var(--success-tint)', title: `🏷 Tag — ${channelName}`, fields: [{ k: 'Add Tags', v: tag }] },
    { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
  ]
  return [
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 1', subtitle: 'Form submitted', fields: [{ k: 'Trigger Type', v: 'Form submitted' }, { k: 'Form is', v: `Leads - ${p.brandName} general` }, { k: 'Workflow trigger name', v: 'Formulario' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 2 (mismo workflow)', subtitle: 'Customer replied — WhatsApp', fields: [{ k: 'Trigger Type', v: 'Customer replied' }, { k: 'Reply channel', v: 'WhatsApp' }, { k: 'WhatsApp number', v: '+507 6535-1411' }, { k: 'Message body contains', v: 'Hola, vengo de la página web y quiero agendar mi tour' }, { k: 'Workflow trigger name', v: 'Whatsapp' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 3 (mismo workflow)', subtitle: 'Customer replied — Chat Widget Sitio Web', fields: [{ k: 'Trigger Type', v: 'Customer replied' }, { k: 'Reply channel', v: 'Chat widget' }, { k: 'Chat widget is', v: 'Chat Widget — maxgym.com.pa' }, { k: 'Workflow trigger name', v: 'Chat en la pagina' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 4 (mismo workflow)', subtitle: 'Customer replied — Chat Widget Instagram', fields: [{ k: 'Trigger Type', v: 'Customer replied' }, { k: 'Reply channel', v: 'Chat widget' }, { k: 'Chat widget is', v: 'Chat Widget — Instagram' }, { k: 'Workflow trigger name', v: 'Chat widget Whatsapp' }] },
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER 5 (mismo workflow)', subtitle: 'Call Details — llamada entrante', fields: [{ k: 'Trigger Type', v: 'Detalles de la llamada' }, { k: 'Call direction', v: 'Entrante' }, { k: 'Workflow trigger name', v: 'Llamadas' }] },
      {
        type: 'condition', color: '#bc8cff', bg: 'var(--purple-tint)', title: '🔀 Fork — según qué trigger disparó', subtitle: '"Workflow trigger" is ...',
        fields: [{ k: 'Action Type', v: 'Condition (Fork the Contact journey through this workflow based on conditions)' }],
        branches: [
          { label: 'Formulario', nodes: channelStep('Formulario', `${p.brandName} - Lead Formulario`, 'google-ads-formulario') },
          { label: 'Whatsapp', nodes: channelStep('WhatsApp', `${p.brandName} - Lead WhatsApp`, 'google-ads-whatsapp') },
          { label: 'Chat en la pagina', nodes: channelStep('Chat Web', `${p.brandName} - Lead Chat Web`, 'google-ads-chat-web') },
          { label: 'Chat widget Whatsapp (Instagram)', nodes: channelStep('Chat Instagram', `${p.brandName} - Lead Chat Instagram`, 'google-ads-chat-instagram') },
          { label: 'Llamadas', nodes: channelStep('Llamada', `${p.brandName} - Lead Llamada`, 'google-ads-llamada') },
          { label: 'None branch (sin match)', nodes: [{ type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ FINAL — sin acción', fields: [] }] },
        ],
      },
    ],
    // ⚠️ Esta 2da cadena (Won → Sale) NO existe en el borrador de Bikans —
    // es un agregado propio (el borrador de referencia solo trackea el
    // evento de Lead por canal, no el de venta). La estructura del fork de
    // arriba sí es 1:1 con la referencia.
    [
      { type: 'trigger', color: '#6366f1', bg: 'var(--primary-tint)', title: '⚡ TRIGGER (2do trigger del mismo workflow, agregado — no está en la referencia)', subtitle: 'Opportunity Changed → Won', fields: [{ k: 'Trigger Type', v: 'Opportunity Changed' }, { k: 'In pipeline', v: p.name }, { k: 'Pipeline stage', v: p.stages.memberSigned.name }, { k: 'Filter', v: 'Contact Tag includes google-ads-*' }] },
      { type: 'gads', color: '#58a6ff', bg: 'var(--info-tint)', title: '🌐 Add to Google Ads — Sale', fields: [{ k: 'Conversion Event', v: `${p.brandName} - Sale (crear primero en Google Ads)` }, { k: 'Currency', v: 'USD' }, { k: 'Conversion Value', v: '{{opportunity.proposal_value}}' }] },
      { type: 'end', color: 'var(--text-faint)', bg: 'var(--surface)', title: '■ END', fields: [] },
    ],
  ]
}

const WORKFLOWS = [
  { id: 1, name: 'Mover a Oportunidad al agendar tour', builder: buildWorkflow1 },
  { id: 2, name: 'Descalificar lead (DQ)', builder: buildWorkflow2 },
  { id: 3, name: 'Manejo secundario de descalificados', builder: buildWorkflow3 },
  { id: 4, name: 'Audiencia Facebook de descalificados', builder: buildWorkflow4 },
  { id: 5, name: 'Marcar leads fríos', builder: buildWorkflow5 },
  { id: 6, name: 'Celebración + pixel al ganar', builder: buildWorkflow6 },
  { id: 7, name: 'Manejo de perdidos (no-DQ)', builder: buildWorkflow7 },
  { id: 8, name: 'Duplicar info de contacto a oportunidad', builder: buildWorkflow8 },
  { id: 9, name: 'Recordatorio de tour', builder: buildWorkflow9 },
  { id: 10, name: 'Desactivar bot al descalificar', builder: buildWorkflow10 },
  { id: 11, name: 'Seguimiento por inactividad (72h)', builder: buildWorkflow11 },
  { id: 12, name: 'Creación de negocio para nuevos leads', builder: buildWorkflow12 },
  { id: 13, name: 'Conversiones Google Ads', builder: buildWorkflow13 },
]

const WF_INFO = {
  1: { count: '4 nodes', trigger: 'Sin trigger — invocado por el bot', desc: 'Actualiza la oportunidad cuando el bot agenda exitosamente el tour (confirmado: sin trigger de calendario)' },
  2: { count: '4 nodes', trigger: 'Sin trigger — invocado por el bot', desc: 'Actualiza la oportunidad a Lost + limpia el follow-up cuando el bot descalifica (TIPO A-F)' },
  3: { count: '5 nodes', trigger: 'Opportunity Changed → stage Descalificado', desc: 'Secondary handling: tag + status + limpieza del workflow de follow-up' },
  4: { count: '4 nodes', trigger: 'Opportunity Changed → stage Descalificado', desc: 'Agrega el lead a la audiencia de Facebook "Leads descalificados" (Custom Audience, no Conversion API)' },
  5: { count: '6 nodes (2 triggers)', trigger: 'Stale Opportunities (x2 stages)', desc: 'Marca leads fríos después de 14 días sin avance en la etapa' },
  6: { count: '8 nodes', trigger: 'Opportunity Changed → stage Won', desc: 'Celebración + Facebook Custom Audience + Conversion API + onboarding al cerrar' },
  7: { count: '5 nodes', trigger: 'Opportunity Changed → stage Lost', desc: 'Manejo de deals perdidos manualmente (no vía IA)' },
  8: { count: '2 nodes', trigger: 'Contact Changed', desc: 'Una sola acción Create/Update Opportunity que mapea los campos calificados del contacto' },
  9: { count: '5 nodes', trigger: 'Appointment Status = confirmed + Wait', desc: 'Recordatorio de tour por WhatsApp, 30 min antes vía Wait "Before appointment"' },
  10: { count: '4 nodes', trigger: 'Opportunity Changed → Status Lost', desc: 'Desactiva el bot IA (Update Conversation AI Bot and Status) + limpia follow-up' },
  11: { count: '~20 nodes (3 ciclos)', trigger: 'Contacto tag: ia-qualifying', desc: 'WhatsApp → Email → Task → Wait until reply (rama nativa reply/timeout) × 3, terminando en tag de poco interés' },
  12: { count: '40 nodes (3 triggers + fork de 3 ramas × 12 acciones)', trigger: 'Customer replied / Form submitted / Facebook lead form submitted', desc: 'Fork por fuente del lead — cada rama: tags + assign round-robin + activar bot + crear oportunidad + sync dueño + follower + aviso interno + bienvenida WhatsApp + tarea + llamada manual + score' },
  13: { count: '~24 nodes (5 triggers + fork de 6 ramas + 1 trigger extra)', trigger: 'Form / WhatsApp / Chat Web / Chat Instagram / Llamada + Opportunity Changed', desc: 'Atribución multi-canal a Google Ads: fork por canal de origen (Lead) + chain separada para Sale al ganar. Basado en workflow real marcado [BORRADOR] — crear las conversiones en Google Ads antes de usar' },
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { copyText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }}
      style={{ background: copied ? 'var(--success-tint)' : 'var(--surface-2)', color: copied ? '#3fb950' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
    >
      {copied ? '✓' : (label || '📋')}
    </button>
  )
}

// Mimetiza el panel real de GHL para "Update Contact/Opportunity Field":
// Action Name / Action Type (dropdown-look) / Fields (dropdown de field +
// caja de value separada, con ícono de tag) — en vez de mostrar Field/Value
// como una tabla key:value genérica.
const GHL_DROPDOWN_STYLE = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--text)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const GHL_LABEL_STYLE = { fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }

function GhlFieldPreview({ node }) {
  const fieldEntry = node.fields.find(f => f.k === 'Field')
  const valueEntry = node.fields.find(f => f.k === 'Value')
  const isOpportunityField = /opportunity\./.test(fieldEntry?.v || '')
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{node.title.replace(/^[^\s]+\s/, '')}</div>

      <div style={GHL_LABEL_STYLE}>Action Type</div>
      <div style={GHL_DROPDOWN_STYLE}><span>Update field data</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Fields ({isOpportunityField ? 'Opportunity' : 'Contact'})</div>
      <div style={{ ...GHL_DROPDOWN_STYLE, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', color: '#58a6ff' }}>{fieldEntry?.v}</span>
        <span style={{ color: 'var(--text-faint)' }}>▾</span>
      </div>
      <div style={GHL_DROPDOWN_STYLE}>
        <span style={{ wordBreak: 'break-word' }}>{valueEntry?.v}</span>
        <span style={{ color: 'var(--text-muted)' }}>🏷</span>
      </div>

      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyBtn text={`${fieldEntry?.v}: ${valueEntry?.v}`} label="Copy" />
      </div>
    </div>
  )
}

const GHL_CHIP_STYLE = { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--text)', marginRight: 6, marginBottom: 6 }

// WhatsApp/SMS — layout de panel no confirmado contra screenshot real (por
// eso sigue sin marcarse como "verificado" como los demás tipos), pero el
// contenido del mensaje SÍ es real — mostramos el body completo de
// WHATSAPP_TEMPLATES cuando el nombre matchea, en vez de solo el nombre.
function GhlSmsPreview({ node }) {
  const templateName = node.fields.find(f => f.k === 'Template')?.v
  const to = node.fields.find(f => f.k === 'To')?.v
  const variables = node.fields.find(f => f.k === 'Variables')?.v
  const tpl = WHATSAPP_TEMPLATES[templateName]
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Select WhatsApp Template</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{templateName} {tpl ? `(${tpl.category})` : ''}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      {to && (
        <>
          <div style={GHL_LABEL_STYLE}>To</div>
          <div style={GHL_DROPDOWN_STYLE}>{to}</div>
        </>
      )}
      {variables && (
        <>
          <div style={GHL_LABEL_STYLE}>Variables</div>
          <div style={GHL_DROPDOWN_STYLE}>{variables}</div>
        </>
      )}

      {tpl ? (
        <>
          <div style={GHL_LABEL_STYLE}>Template <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-faint)' }}>(mensaje real, ver artifacts/08_WhatsApp_Templates.html)</span></div>
          <div style={{ ...GHL_DROPDOWN_STYLE, display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.5, padding: '10px 12px' }}>{tpl.body}</div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>⚠️ Template no encontrado en WHATSAPP_TEMPLATES — verificar nombre exacto</div>
      )}
    </div>
  )
}

// Add/Remove Contact Tag — confirmado: Action Name, Tags (chips con x + search),
// "+ Add New Tag" si no existe. (help.gohighlevel.com/.../155000003111)
function GhlTagPreview({ node }) {
  const addEntry = node.fields.find(f => f.k === 'Add Tags' || f.k === 'Tags' || f.k === 'Tag')
  const removeEntry = node.fields.find(f => f.k === 'Remove Tags')
  const addTags = addEntry?.v.split(',').map(t => t.trim()).filter(Boolean) || []
  const removeTags = removeEntry?.v.split(',').map(t => t.trim()).filter(Boolean) || []
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{node.title.replace(/^[^\s]+\s/, '')}</div>

      <div style={GHL_LABEL_STYLE}>Tags{removeTags.length ? ' — Add' : ''}</div>
      <div style={{ ...GHL_DROPDOWN_STYLE, flexWrap: 'wrap', minHeight: 36 }}>
        {addTags.map((t, i) => (
          <span key={i} style={GHL_CHIP_STYLE}>{t} <span style={{ color: 'var(--text-faint)' }}>×</span></span>
        ))}
        <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 'auto' }}>🔍 Search</span>
      </div>

      {removeTags.length > 0 && (
        <>
          <div style={GHL_LABEL_STYLE}>Tags — Remove</div>
          <div style={{ ...GHL_DROPDOWN_STYLE, flexWrap: 'wrap', minHeight: 36 }}>
            {removeTags.map((t, i) => (
              <span key={i} style={GHL_CHIP_STYLE}>{t} <span style={{ color: 'var(--text-faint)' }}>×</span></span>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Si un tag no existe, escribilo y click "+ Add New Tag" para crearlo ahí mismo.</div>
    </div>
  )
}

// Wait — 7 modos reales, resaltamos el que corresponde a este nodo.
// (help.gohighlevel.com/.../155000002470)
const WAIT_MODES = [
  'A set period of time',
  'A specific date and time',
  'A recurring schedule',
  'An upcoming appointment or booking',
  'The contact to reply',
  'The contact to take an action',
  'Specific conditions to be met',
]
function GhlWaitPreview({ node }) {
  const isAppointment = node.fields.some(f => f.k === 'Wait mode' || f.k === 'Relative to')
  const activeMode = isAppointment ? 3 : 0
  const durationEntry = node.fields.find(f => f.k === 'Duration')
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{node.title.replace(/^[^\s]+\s/, '')}</div>

      <div style={GHL_LABEL_STYLE}>Wait until...</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {WAIT_MODES.map((m, i) => (
          <div key={i} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12,
            background: i === activeMode ? 'var(--primary-tint)' : 'var(--bg)',
            border: `1px solid ${i === activeMode ? '#6366f1' : 'var(--border)'}`,
            color: i === activeMode ? 'var(--primary-soft)' : 'var(--text-faint)',
          }}>{m}</div>
        ))}
      </div>

      {isAppointment ? (
        <>
          <div style={GHL_LABEL_STYLE}>Type</div>
          <div style={GHL_DROPDOWN_STYLE}><span>Appointment / Calendar Event</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>
          <div style={GHL_LABEL_STYLE}>When should the Contact proceed?</div>
          <div style={GHL_DROPDOWN_STYLE}><span>{node.fields.find(f => f.k === 'Wait mode')?.v || 'Before'} — {node.fields.find(f => f.k === 'Relative to')?.v}</span></div>
          <div style={GHL_LABEL_STYLE}>Duration</div>
          <div style={GHL_DROPDOWN_STYLE}>{node.fields.find(f => f.k === 'Duration')?.v}</div>
        </>
      ) : (
        <>
          <div style={GHL_LABEL_STYLE}>Time period / Unit</div>
          <div style={GHL_DROPDOWN_STYLE}>{durationEntry?.v}</div>
        </>
      )}
    </div>
  )
}

// Send Internal Notification — varía por canal; layout de Email confirmado
// (help.gohighlevel.com/.../155000003202). Nuestros nodos solo definen
// Channel + Message, el resto son valores razonables por default de GHL.
function GhlNotifyPreview({ node }) {
  const channel = node.fields.find(f => f.k === 'Channel')?.v || 'Email'
  const message = node.fields.find(f => f.k === 'Message')?.v || ''
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{node.title.replace(/^[^\s]+\s/, '')}</div>

      <div style={GHL_LABEL_STYLE}>Type of Notification</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{channel}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>To User Type</div>
      <div style={GHL_DROPDOWN_STYLE}><span>Assigned User</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      {channel === 'Email' && (
        <>
          <div style={GHL_LABEL_STYLE}>Subject</div>
          <div style={GHL_DROPDOWN_STYLE}>Notificación — {node.title.replace(/^[^\s]+\s/, '')}</div>
        </>
      )}

      <div style={GHL_LABEL_STYLE}>Message</div>
      <div style={{ ...GHL_DROPDOWN_STYLE, minHeight: 50, alignItems: 'flex-start' }}>
        <span style={{ wordBreak: 'break-word' }}>{message}</span>
        <span style={{ color: 'var(--text-muted)' }}>🏷</span>
      </div>
    </div>
  )
}

// Create Opportunity / Update Opportunity (la combinada "Create/Update" está
// deprecada — help.gohighlevel.com/.../155000004752). Mismo shape de campos
// para 'stage' (cambio de etapa) y 'opp' (creación).
function GhlOpportunityPreview({ node }) {
  const isCreate = node.type === 'opp'
  const pipeline = node.fields.find(f => f.k === 'Pipeline')?.v
  const stage = node.fields.find(f => f.k === 'New Stage' || f.k === 'Stage')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{isCreate ? 'Create Opportunity' : 'Update Opportunity'}</div>

      <div style={GHL_LABEL_STYLE}>Pipeline</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{pipeline}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Pipeline Stage</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{stage}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      {isCreate && (
        <>
          <div style={GHL_LABEL_STYLE}>Opportunity Name</div>
          <div style={GHL_DROPDOWN_STYLE}>{'{{contact.name}}'}</div>
          <div style={GHL_LABEL_STYLE}>Status</div>
          <div style={GHL_DROPDOWN_STYLE}><span>Open</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>
        </>
      )}
    </div>
  )
}

// Facebook Conversion API — confirmado con screenshot real (cuenta Bikans):
// tiene 2 modos de conexión reales, "Integración" (token + dataset ID a mano)
// es el que efectivamente está en uso en la referencia, no "Administrador de
// Anuncios" (Ad Manager, sin token) que era mi único supuesto anterior.
function GhlConversionPreview({ node }) {
  const connType = node.fields.find(f => f.k === 'Connection Type')?.v || 'Integración'
  const eventType = node.fields.find(f => f.k === 'Event Type')?.v
  const event = node.fields.find(f => f.k === 'Event')?.v
  const value = node.fields.find(f => f.k === 'Value')?.v
  const currency = node.fields.find(f => f.k === 'Currency')?.v
  const isIntegracion = connType === 'Integración'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Seleccione el tipo de conexión</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: isIntegracion ? 'var(--primary-soft)' : 'var(--text-faint)' }}>{isIntegracion ? '●' : '○'} Integración</span>
        <span style={{ color: !isIntegracion ? 'var(--primary-soft)' : 'var(--text-faint)' }}>{!isIntegracion ? '●' : '○'} Administrador de anuncios</span>
      </div>

      <div style={GHL_LABEL_STYLE}>Tipo de evento</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{eventType || 'Funnel Event'}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      {isIntegracion ? (
        <>
          <div style={GHL_LABEL_STYLE}>Token de acceso</div>
          <div style={GHL_DROPDOWN_STYLE}><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)' }}>EAAX••••••••••••••••••••••••</span><span style={{ color: 'var(--text-muted)' }}>🏷</span></div>
          <div style={GHL_LABEL_STYLE}>ID del conjunto de datos</div>
          <div style={GHL_DROPDOWN_STYLE}><span style={{ color: 'var(--text-faint)' }}>(Pixel/Dataset ID de Meta Events Manager)</span><span style={{ color: 'var(--text-muted)' }}>🏷</span></div>
        </>
      ) : (
        <div style={GHL_LABEL_STYLE}>Pixel: pre-poblado desde Ad Manager</div>
      )}

      <div style={GHL_LABEL_STYLE}>Nombre del evento de Facebook</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{event}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Valor</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{value}</span><span style={{ color: 'var(--text-muted)' }}>🏷</span></div>

      <div style={GHL_LABEL_STYLE}>Moneda</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{currency || 'USD'}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>
    </div>
  )
}

// Facebook — Añadir a público personalizado de Facebook. Distinta de
// Conversion API: agrega el contacto a un Custom Audience para retargeting,
// no manda un evento de conversión. Confirmado con screenshot real.
function GhlFacebookAudiencePreview({ node }) {
  const account = node.fields.find(f => f.k === 'Facebook Account')?.v
  const audience = node.fields.find(f => f.k === 'Audience')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: 'var(--success-tint)', border: '1px solid #3fb95040', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#3fb950', marginBottom: 10 }}>
        📘 Facebook <span style={{ marginLeft: 6 }}>✓ Conectado</span>
      </div>
      <div style={GHL_LABEL_STYLE}>ID de cuenta de Facebook</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{account}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Action Name</div>
      <div style={GHL_DROPDOWN_STYLE}>{node.title.replace(/^[^\s]+\s/, '')}</div>

      <div style={GHL_LABEL_STYLE}>ID de audiencia de clientes de Facebook</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{audience}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>
    </div>
  )
}

// Update conversation AI bot and status — acción real confirmada con
// screenshot (Bikans): desactiva/reactiva un bot IA específico para un
// contacto. No es "no existe como nodo de workflow" — es una acción real.
function GhlAiBotStatusPreview({ node }) {
  const bot = node.fields.find(f => f.k === 'Bot')?.v
  const status = node.fields.find(f => f.k === 'Status')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Change assigned Conversation AI bot</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{bot}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Update bot's status to</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{status}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Reactivate bot after <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-faint)' }}>(opcional)</span></div>
      <div style={GHL_DROPDOWN_STYLE}><span style={{ color: 'var(--text-faint)' }}>☐ Reactivate bot after...</span></div>
    </div>
  )
}

// Assign User — confirmado con screenshot real (WF12 Bikans): asigna el
// contacto a uno o más usuarios (round-robin si hay más de uno), con toggle
// "Only apply to unassigned contacts" para no reasignar a alguien que ya
// tiene dueño.
function GhlAssignUserPreview({ node }) {
  const users = node.fields.find(f => f.k === 'Users')?.v
  const onlyUnassigned = node.fields.find(f => f.k === 'Only Apply to Unassigned')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Users <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-faint)' }}>(2+ = round-robin)</span></div>
      <div style={GHL_DROPDOWN_STYLE}><span>{users}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ width: 28, height: 16, borderRadius: 8, background: onlyUnassigned === 'On' ? '#3fb950' : 'var(--border)', position: 'relative', display: 'inline-block' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: onlyUnassigned === 'On' ? 14 : 2 }} />
        </span>
        Only apply to unassigned contacts
      </div>
    </div>
  )
}

// Add Owner to Opportunity — confirmado con screenshot real: User (no es
// round-robin acá, es un usuario fijo) + toggle "Only apply to unassigned
// opportunities". Distinta de Assign User (esa es a nivel contacto).
function GhlOwnerSyncPreview({ node }) {
  const user = node.fields.find(f => f.k === 'User')?.v
  const onlyUnassigned = node.fields.find(f => f.k === 'Only Apply to Unassigned Opportunities')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>User</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{user}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ width: 28, height: 16, borderRadius: 8, background: onlyUnassigned === 'On' ? '#3fb950' : 'var(--border)', position: 'relative', display: 'inline-block' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: onlyUnassigned === 'On' ? 14 : 2 }} />
        </span>
        Only apply to unassigned opportunities
      </div>
    </div>
  )
}

// Add Contact Followers — confirmado con screenshot real: solo un multi-select
// de usuarios que quedan como followers del contacto (reciben notificaciones
// de actividad sin ser el dueño).
function GhlFollowersPreview({ node }) {
  const followers = node.fields.find(f => f.k === 'Followers')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Followers</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{followers}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>
    </div>
  )
}

// Modify Contact Engagement Score — confirmado con screenshot real:
// Adjustment (Add/Subtract/Set) + Points.
function GhlEngagementScorePreview({ node }) {
  const adjustment = node.fields.find(f => f.k === 'Adjustment')?.v
  const points = node.fields.find(f => f.k === 'Points')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Adjustment</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{adjustment}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Points</div>
      <div style={GHL_DROPDOWN_STYLE}>{points}</div>
    </div>
  )
}

// Add to Google Ads — confirmado: Conversion Event (nombre exacto de la
// cuenta), Currency, Conversion Value, Custom Mapping (GCLID/GBRAID/WBRAID).
// (help.gohighlevel.com/.../155000003368)
function GhlGoogleAdsPreview({ node }) {
  const event = node.fields.find(f => f.k === 'Conversion Event')?.v
  const currency = node.fields.find(f => f.k === 'Currency')?.v
  const value = node.fields.find(f => f.k === 'Conversion Value')?.v
  return (
    <div style={{ marginTop: 12 }}>
      <div style={GHL_LABEL_STYLE}>Conversion Event <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-faint)' }}>(debe matchear exacto con Google Ads, incluida mayúscula/minúscula)</span></div>
      <div style={GHL_DROPDOWN_STYLE}><span>{event}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Currency</div>
      <div style={GHL_DROPDOWN_STYLE}><span>{currency}</span><span style={{ color: 'var(--text-faint)' }}>▾</span></div>

      <div style={GHL_LABEL_STYLE}>Conversion Value</div>
      <div style={GHL_DROPDOWN_STYLE}>{value}</div>

      <div style={GHL_LABEL_STYLE}>Custom Mapping</div>
      <div style={GHL_DROPDOWN_STYLE}><span style={{ color: 'var(--text-faint)' }}>Off — usa GCLID/GBRAID/WBRAID automático del contacto</span></div>
    </div>
  )
}

// Elige el preview real por tipo de nodo, o cae a la tabla genérica key:value
// para los tipos que todavía no verificamos contra un panel real de GHL
// (sms/WhatsApp, bot, task, condition — ver NODE_HOWTO para el estado de cada uno).
function NodeFieldsPreview({ node }) {
  const Preview = {
    field: GhlFieldPreview,
    tag: GhlTagPreview,
    wait: GhlWaitPreview,
    notify: GhlNotifyPreview,
    stage: GhlOpportunityPreview,
    opp: GhlOpportunityPreview,
    http: GhlConversionPreview,
    gads: GhlGoogleAdsPreview,
    fbaudience: GhlFacebookAudiencePreview,
    aibot: GhlAiBotStatusPreview,
    assignuser: GhlAssignUserPreview,
    ownersync: GhlOwnerSyncPreview,
    followers: GhlFollowersPreview,
    engagementscore: GhlEngagementScorePreview,
    sms: GhlSmsPreview,
  }[node.type]

  if (Preview) return <Preview node={node} />

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <tbody>
          {node.fields.map((f, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-muted)', paddingRight: 12, paddingBottom: 4, whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 500, minWidth: 80 }}>{f.k}</td>
              <td style={{ color: f.mono ? '#58a6ff' : 'var(--text)', fontFamily: f.mono ? 'var(--mono)' : 'inherit', fontSize: f.mono ? 10 : 11, paddingBottom: 4, wordBreak: 'break-all' }}>{f.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyBtn text={node.fields.map(f => `${f.k}: ${f.v}`).join('\n')} label="Copy" />
      </div>
    </>
  )
}

function ConnectorLine({ color = 'var(--border)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <div style={{ width: 2, height: 16, background: color, borderRadius: 1 }} />
    </div>
  )
}

// Cómo armar cada TIPO de nodo dentro del builder visual de GHL. Genérico por
// tipo (no por nodo individual) porque el panel de config de GHL es el mismo
// para, por ej., cualquier "Add Contact Tag" — cambia el tag, no los pasos.
// Investigado contra help.gohighlevel.com (2026-07) — no genérico "click acá,
// después allá", son los campos reales que pide cada acción según la doc
// oficial. Fuentes citadas en cada bloque para poder re-verificar.
const NODE_HOWTO = {
  trigger: [
    'Automations → Workflows → abrí el workflow → "+ Add Trigger"',
    'Buscá el trigger exacto de "Trigger Type" en el picker (categorías: Contact, Events, Appointments, Opportunities...)',
    'Completá los campos propios de ese trigger — varían mucho por trigger, ver la tabla de abajo para este nodo específico',
    'Guardá con "Save" y después el botón azul de guardar arriba a la derecha del workflow entero',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000002288-getting-started-with-workflows)',
  ],
  condition: [
    'Click en "+" → "If/Else" (2 ramas) o "Condition"/"Fork" (N ramas nombradas — confirmado con screenshot real: soporta más de Sí/No, cada rama con su propio nombre, ej. "Formulario LP", "Formulario Meta", más una "None branch" de fallback)',
    'En "Add Condition"/"Add branch" elegí el filtro. Para chequear qué trigger disparó la corrida en un workflow multi-trigger, el Condition Type es "Workflow trigger" — operador "Is" — valor: el "Workflow trigger name" que le pusiste a cada trigger',
    'Para tags/campos multi-opción, el operador suele ser "Includes" / "Does not include"; para presencia de valor, "Is empty" / "Is not empty"',
    'GHL crea automáticamente una rama "None" que corre cuando ninguna condición matchea — no se puede borrar ni editar',
    'Arrastrá las acciones de cada rama a su columna correspondiente',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000002471-workflow-action-if-else + screenshot real de cuenta en producción para el Fork multi-rama)',
  ],
  ownersync: [
    'Click en "+" → "Add Owner to Opportunity"',
    'Crea (o actualiza) el dueño de la oportunidad con el User que elijas — normalmente el mismo que ya asignaste al contacto con "Assign User", para que el pipeline muestre de entrada quién es responsable',
    '"Only apply to unassigned opportunities": si está ON, no pisa el dueño de una oportunidad que ya tiene uno',
    '⚠️ Si "Duplicate opportunities" está deshabilitado en la action de crear la oportunidad y ya existe una en el mismo pipeline, esta action no se ejecuta',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  followers: [
    'Click en "+" → "Add Contact Followers"',
    'Followers: elegí uno o más usuarios — quedan como seguidores del contacto (reciben notificaciones de actividad) sin ser el dueño asignado',
    'Útil para que un gerente o supervisor vea la actividad de leads que no le pertenecen directamente',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  engagementscore: [
    'Click en "+" → "Modify Contact Engagement Score"',
    'Adjustment: Add / Subtract / Set — cómo se aplica el cambio',
    'Points: cuántos puntos sumar/restar/fijar',
    'Útil para priorizar leads más activos en reportes o vistas ordenadas por score',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  manualcall: [
    'Click en "+" → "Manual Call"',
    'Solo pide un nombre de action — crea una Manual Action para que alguien del equipo llame al contacto (aparece en Conversations → Manual Actions), no marca ni conecta la llamada automáticamente',
    '(fuente: screenshot real de cuenta GHL en producción, layout exacto del panel no confirmado más allá del nombre)',
  ],
  tag: [
    'Actions panel → sección "Contact" → "Add Contact Tag" (o "Remove Contact Tag" si la fila dice "Remove Tags")',
    'Ponele un nombre descriptivo en "Action Name" — ayuda a leer el workflow después',
    'Tags dropdown: elegí el/los tag(s) existentes, o escribí uno nuevo y click "+ Add New Tag" para crearlo ahí mismo',
    'Los cambios de selección no aplican hasta confirmar — si estás editando el trigger "Contact Tag", hay que darle "Apply" antes de guardar',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000003111-workflow-action-add-contact-tag)',
  ],
  field: [
    'Automation → Workflows → abrí el workflow → "+" → "Update Contact Field" (o el campo es de oportunidad — usar "Update Opportunity Field", ver 03_Custom_Fields_Table.html para saber de qué lado está)',
    'Nombrá la acción claramente (ej. "Update Contact Address")',
    '"Action Type" tiene dos modos: limpiar el campo (clear) o actualizarlo con un valor',
    'Elegí el campo exacto del dropdown — tiene que existir ya, GHL no lo crea solo',
    'Pegá el valor de la fila "Value" abajo (puede ser texto fijo o un valor dinámico {{...}})',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000002688-workflow-action-update-contact-field)',
  ],
  stage: [
    '⚠️ "Create/Update Opportunity" combinada está deprecada — usar "Create Opportunity" (para una nueva) o "Update Opportunity" (para cambiar de stage una existente) por separado',
    'Elegí el pipeline correcto en el dropdown "Pipeline" — controla qué stages están disponibles',
    'Elegí el nuevo stage exacto de "New Stage"',
    'También podés cambiar name/source/lead value/status de la oportunidad en la misma acción',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000002476-workflow-action-create-update-opportunity, marcada deprecada a favor de Create Opportunity / Update Opportunity)',
  ],
  notify: [
    'Click en "+" → "Send Internal Notification"',
    'Elegí canal: Email, In-App, SMS o WhatsApp — el que mejor le llegue a tu equipo',
    'Para Email: "From Name", "From Email" (opcional, si no usa el default), "To User Type" (a qué rol/usuario llega), CC/BCC opcional, y "Subject"',
    'Pegá el mensaje de la fila "Message" abajo',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000003202-workflow-action-internal-notification)',
  ],
  sms: [
    'Click en "+" → "WhatsApp"',
    'Panel confirmado con screenshot real: ACTION NAME, SELECT WHATSAPP TEMPLATE (dropdown de plantillas ya aprobadas en Meta, formato "nombre (idioma) - CATEGORÍA"), "ENABLE BRANCHES" (toggle — genera ramas automáticas por los botones de quick-reply de la plantilla), SELECT FROM PHONE NUMBER, y el cuerpo del mensaje se previsualiza tal cual quedó aprobado (no editable ahí, se edita la plantilla en Meta Business Manager)',
    'Fuera de la ventana de 24h desde el último mensaje del contacto, SOLO se puede mandar una plantilla pre-aprobada — texto libre no está disponible',
    'Mapeá las variables ({{1}}, {{2}}...) a los campos reales del contacto/cita — el texto completo de cada plantilla real está en 08_WhatsApp_Templates.html y en WHATSAPP_TEMPLATES de este archivo',
    '(fuente: screenshot real de cuenta GHL en producción + help.gohighlevel.com/support/solutions/articles/155000003531-workflow-action-whatsapp)',
  ],
  http: [
    'Click en "+" → "Facebook Conversion API" (o el nombre que aparezca en tu picker de acciones)',
    'Elegí "Seleccione el tipo de conexión": Integración (pega Token de Acceso + ID del conjunto de datos a mano, generados en Meta Events Manager) o Administrador de Anuncios (usa un pixel ya conectado, sin token manual) — confirmado con screenshot real que "Integración" es el modo más común en cuentas ya configuradas',
    'Tipo de Evento: Funnel Event (conversión genérica) o Lead Event — condiciona qué triggers son compatibles',
    '⚠️ Compatibilidad de trigger por Tipo de Evento: Funnel solo desde Form Submitted, Survey Submitted, Customer Booked Appointment u Order Form Submission. Lead solo desde Facebook Lead Form Submission o Pipeline/Opportunity Changed',
    'Nombre del Evento de Facebook: el evento real (ej. "Lead", "Purchase")',
    'Valor + Moneda: el valor de la conversión y su moneda (USD, COP, etc.)',
    '(fuente: screenshot real de cuenta GHL en producción + help.gohighlevel.com/.../155000003691)',
  ],
  fbaudience: [
    'Click en "+" → "Facebook - Añadir a público personalizado de Facebook" (distinta de Conversion API: esta agrega el contacto a una audiencia para retargeting, no manda un evento de conversión)',
    'Requiere la cuenta de Facebook ya conectada (Settings → Integrations)',
    'Elegí el "ID de cuenta de Facebook" y el "ID de audiencia de clientes de Facebook" (la audiencia ya tiene que existir en Meta Ads Manager)',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  aibot: [
    'Click en "+" → "Update conversation AI bot and status" — SÍ es una acción real de workflow (confirmado con screenshot), no solo algo configurable dentro del bot',
    '"Change assigned Conversation AI bot": elegí el bot IA a activar/desactivar para este contacto',
    '"Update bot\'s status to": Active o Inactive',
    '"Reactivate bot after" (opcional): reactivación automática después de X tiempo',
    'Útil para desactivar el bot cuando un lead se descalifica, sin tener que usar la acción "Stop Bot" interna del AI Agent',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  gads: [
    'Click en "+" → "Add to Google Ads"',
    'Conversion Event: es un DROPDOWN de las conversiones ya configuradas en tu cuenta de Google Ads (no texto libre) — tenés que crear la conversión en Google Ads primero para que aparezca en la lista',
    'Currency + Conversion Value: la moneda y el valor atribuido a la conversión',
    'Custom Mapping (opcional): mapear GCLID/GBRAID/WBRAID a campos del workflow si necesitás más control',
    '⚠️ Requiere que el contacto tenga GCLID/GBRAID/WBRAID capturado del click original del ad — sin eso, no hay atribución posible',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000003368-workflow-action-add-to-google-adwords)',
  ],
  removewf: [
    'Click en "+" → "Remove from Workflow"',
    'Workflow: "Otro flujo de trabajo" (deja al contacto en el workflow actual) o "Este flujo de trabajo"',
    'Select Workflows: elegí de qué otro(s) workflow(s) sacar al contacto — típico para cortar una secuencia de follow-up cuando el lead ya avanzó o se descalificó',
    '(fuente: screenshot real de cuenta GHL en producción)',
  ],
  assignuser: [
    'Click en "+" → "Assign User"',
    'Users: uno o más usuarios — si elegís 2+, GHL reparte los contactos entre ellos round-robin automáticamente',
    '"Only apply to unassigned contacts": si está ON, no reasigna a un contacto que ya tiene un dueño (evita robarle leads a otro comercial)',
    '(fuente: screenshot real de cuenta GHL en producción, workflow de creación de leads con reparto entre comerciales)',
  ],
  bot: [
    'Esto NO es un nodo de workflow — se configura adentro del AI Agent Bot (Conversation AI → tu bot → Actions)',
    'Ver la acción exacta en artifacts/05_AI_Agent_Actions.html',
  ],
  wait: [
    'Click en "+" → "Wait" (buscalo en el panel de acciones si no aparece arriba)',
    'GHL presenta 7 modos en pantalla de selección: duración fija, fecha específica, horario recurrente, relativo a cita/booking/invoice, esperar respuesta, esperar una acción, o condiciones — elegí el resaltado abajo',
    'Para recordatorios de cita: modo "An upcoming appointment or booking" con "When should the Contact proceed?" en Before, NO un trigger "Scheduler" — Scheduler es contactless y no enrola al contacto',
    'Nombrá la acción con algo descriptivo (ej. "Wait - 24h antes de la cita")',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000002470-workflow-action-wait)',
  ],
  task: [
    'Click en "+" → "Add Task"',
    'Completá título y usuario asignado',
    '"Due In" se puede poner en modo dinámico (fecha/hora exacta, o un custom value/variable dinámica)',
    'Si no hay contacto en ese punto del workflow (ej. viene de un trigger Scheduler), la tarea se crea igual como standalone, sin contacto asociado',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000004498-task-management, 155000006653-workflow-trigger-scheduler — el layout exacto del panel de Add Task en el workflow builder no está detallado en la doc pública)',
  ],
  opp: [
    '⚠️ La acción combinada "Create/Update Opportunity" está deprecada — usar "Create Opportunity" (nueva) o "Update Opportunity" (existente) por separado',
    'Action Name → Pipeline → Pipeline Stage → Opportunity Name → Opportunity Source → Status (default "Open") → Duplicate Opportunity (toggle) → Opportunity Value',
    '(fuente: help.gohighlevel.com/support/solutions/articles/155000004752-workflow-action-create-opportunity)',
  ],
  end: [
    'No requiere acción — fin de esta rama del workflow',
  ],
}

const BRANCH_COLORS = ['#3fb950', '#f85149', '#58a6ff', '#d29922', '#bc8cff', '#39d353']

// node.branches: [{ label, nodes }] — el "Fork"/Condition real de GHL soporta
// N ramas nombradas + una "None branch" de fallback (confirmado con
// screenshot real, WF12), no solo Sí/No. node.yes/node.no siguen soportados
// para el caso binario (If/Else clásico) — se normalizan acá a la misma forma.
function getBranchList(node) {
  if (node.branches) return node.branches
  const list = []
  if (node.yes) list.push({ label: node.yesLabel || 'YES →', nodes: node.yes })
  if (node.no) list.push({ label: node.noLabel || 'NO →', nodes: node.no })
  return list
}

function NodeCard({ node, depth = 0 }) {
  const [open, setOpen] = useState(false)
  const isLeaf = node.type === 'end'
  const branchList = getBranchList(node)
  const hasBranches = branchList.length > 0
  const isWait = node.type === 'wait'

  return (
    <div style={{ marginLeft: depth * 0 }}>
      {depth > 0 && <ConnectorLine color={node.color} />}

      <div
        onClick={() => !isLeaf && setOpen(o => !o)}
        style={{
          background: `${node.color}14`,
          border: `1px solid ${node.color}50`,
          borderLeft: `4px solid ${node.color}`,
          borderRadius: 8,
          padding: '12px 16px',
          cursor: isLeaf ? 'default' : 'pointer',
          transition: 'all .15s',
          minWidth: 320,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 18, lineHeight: 1 }}>{node.title.split(' ')[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: node.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {node.type}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
              {node.title.replace(/^[^\s]+\s/, '')}
            </div>
            {node.subtitle && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{node.subtitle}</div>
            )}
          </div>
          {!isLeaf && (
            <span style={{ color: 'var(--text-muted)', fontSize: 10, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>

        {open && node.fields?.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${node.color}30`, paddingTop: 10 }}>
            <NodeFieldsPreview node={node} />
          </div>
        )}
      </div>

      {hasBranches && open && (
        <div style={{ marginTop: 8, marginLeft: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {branchList.map((b, bi) => {
            const c = BRANCH_COLORS[bi % BRANCH_COLORS.length]
            return (
              <div key={bi} style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                  {b.label}
                </div>
                {b.nodes.map((n, i) => <NodeCard key={i} node={n} depth={1} />)}
              </div>
            )
          })}
        </div>
      )}

      {hasBranches && !open && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, marginLeft: 12, flexWrap: 'wrap' }}>
          {branchList.map((b, bi) => {
            const c = BRANCH_COLORS[bi % BRANCH_COLORS.length]
            return (
              <div key={bi} style={{ flex: 1, minWidth: 160, padding: '6px 10px', background: `${c}15`, borderRadius: 6, border: `1px solid ${c}30`, fontSize: 11, color: c }}>
                {b.label}: {b.nodes.length} acción{b.nodes.length > 1 ? 'es' : ''}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// buildWorkflowN(p) siempre devuelve chains: Node[][] — casi todos los workflows
// tienen 1 sola cadena (1 trigger → acciones), pero GHL soporta múltiples
// triggers en el mismo workflow (rules/workflows.md), y algunos casos reales
// (WF5, WF13) lo necesitan porque un IF/ELSE no puede "esperar" un evento
// futuro distinto al que disparó la corrida actual.
function WorkflowView({ chains }) {
  return (
    <div style={{ maxWidth: 900 }}>
      {chains.map((nodes, ci) => (
        <div key={ci} style={{ marginBottom: chains.length > 1 ? 20 : 0 }}>
          {ci > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px', color: 'var(--text-faint)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              trigger alternativo (mismo workflow)
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          )}
          {nodes.map((node, i) => (
            <div key={i}>
              {i > 0 && <ConnectorLine color={nodes[i-1].color} />}
              <NodeCard node={node} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Flatten the node tree (incl. yes/no branches) into a linear build order.
// GHL's builder is assembled node-by-node in the UI, so this walks the tree
// depth-first the same order a person would click "+ Add Step" through it.
function flattenNodes(nodes, branch = null, depth = 0) {
  let result = []
  nodes.forEach((node) => {
    result.push({ node, branch, depth })
    getBranchList(node).forEach(b => {
      result = result.concat(flattenNodes(b.nodes, b.label, depth + 1))
    })
  })
  return result
}

// Igual pero recorriendo todas las cadenas (multi-trigger) en orden.
function flattenChains(chains) {
  let result = []
  chains.forEach((nodes, chainIdx) => {
    result = result.concat(flattenNodes(nodes).map(s => ({ ...s, chainIdx })))
  })
  return result
}

function BuildWizard({ selectedWf, onSelectWf }) {
  const wf = WORKFLOWS.find(w => w.id === selectedWf)
  const chains = wf.builder(PIPELINE)
  const steps = flattenChains(chains)
  const storageKey = `wf-build-progress-${selectedWf}`

  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {} } catch { return {} }
  })
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    setStepIdx(0)
    try { setDone(JSON.parse(localStorage.getItem(`wf-build-progress-${selectedWf}`)) || {}) } catch { setDone({}) }
  }, [selectedWf])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(done))
  }, [done, storageKey])

  const toggleDone = (i) => setDone(d => ({ ...d, [i]: !d[i] }))
  const doneCount = steps.filter((_, i) => done[i]).length
  const pct = Math.round((doneCount / steps.length) * 100)
  const current = steps[stepIdx]

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ width: 260, flexShrink: 0 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
          Workflow a construir
        </label>
        <select
          value={selectedWf}
          onChange={e => onSelectWf(Number(e.target.value))}
          style={{ width: '100%', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, marginBottom: 16 }}
        >
          {WORKFLOWS.map(w => (
            <option key={w.id} value={w.id}>WF {w.id}: {w.name}</option>
          ))}
        </select>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Progreso</span>
            <span>{doneCount}/{steps.length}</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#3fb950' : '#6366f1', transition: 'width .2s' }} />
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Todos los pasos
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '6px 8px', marginBottom: 2, marginLeft: s.depth * 10,
                background: stepIdx === i ? 'var(--primary-tint)' : 'transparent',
                border: `1px solid ${stepIdx === i ? '#6366f1' : 'transparent'}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11 }}>{done[i] ? '✅' : '⬜'}</span>
              <span style={{ fontSize: 11, color: stepIdx === i ? 'var(--primary-soft)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chains.length > 1 && <span style={{ color: 'var(--primary-soft)' }}>T{s.chainIdx + 1} · </span>}
                {s.branch && <span style={{ color: s.branch === 'YES' ? '#3fb950' : '#f85149' }}>{s.branch} · </span>}
                {s.node.title.replace(/^[^\s]+\s/, '')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          🧱 <strong style={{ color: 'var(--text)' }}>Modo build:</strong> GHL no permite crear la lógica de un workflow por API — armá este nodo en el builder visual de GHL y marcá el paso como hecho para pasar al siguiente.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paso {stepIdx + 1} de {steps.length}</span>
          {chains.length > 1 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-soft)' }}>trigger {current.chainIdx + 1}/{chains.length}</span>
          )}
          {current.branch && (
            <span style={{ fontSize: 11, fontWeight: 700, color: current.branch === 'YES' ? '#3fb950' : '#f85149' }}>
              rama {current.branch}
            </span>
          )}
        </div>

        <div style={{ background: `${current.node.color}14`, border: `1px solid ${current.node.color}50`, borderLeft: `4px solid ${current.node.color}`, borderRadius: 8, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: current.node.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {current.node.type}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {current.node.title}
          </div>
          {current.node.subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{current.node.subtitle}</div>
          )}

          {NODE_HOWTO[current.node.type] && (
            <div style={{ marginTop: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>🛠 Cómo configurar esto en GHL</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {NODE_HOWTO[current.node.type].map((step, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.5 }}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {current.node.fields?.length > 0 && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${current.node.color}30`, paddingTop: 12 }}>
              <NodeFieldsPreview node={current.node} />
            </div>
          )}

        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!done[stepIdx]} onChange={() => toggleDone(stepIdx)} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Ya armé este nodo en GHL</span>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setStepIdx(i => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            style={{ background: 'var(--surface-2)', color: stepIdx === 0 ? 'var(--border-strong)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 12, cursor: stepIdx === 0 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => {
              if (!done[stepIdx]) toggleDone(stepIdx)
              setStepIdx(i => Math.min(steps.length - 1, i + 1))
            }}
            disabled={stepIdx === steps.length - 1}
            style={{ background: stepIdx === steps.length - 1 ? 'var(--surface-2)' : '#6366f1', color: stepIdx === steps.length - 1 ? 'var(--border-strong)' : '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, cursor: stepIdx === steps.length - 1 ? 'not-allowed' : 'pointer' }}
          >
            Marcar hecho y siguiente →
          </button>
        </div>

        {pct === 100 && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--success-tint)', border: '1px solid #3fb950', borderRadius: 8, fontSize: 13, color: '#3fb950' }}>
            🎉 WF {wf.id} completo — los {steps.length} nodos están marcados como configurados.
          </div>
        )}
      </div>
    </div>
  )
}

function GhlApiPanel({ selectedWf }) {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(GHL_ACCOUNTS[0].name)
  const [command, setCommand] = useState('')

  const quickCommands = [
    { label: 'List Workflows', cmd: 'python3 ~/.claude/skills/ghl-api/scripts/workflows.py [ACCOUNT_NAME] list --limit 5' },
    { label: 'List Pipelines', cmd: 'python3 ~/.claude/skills/ghl-api/scripts/opportunities.py [ACCOUNT_NAME] list-pipelines' },
    { label: 'List Contacts', cmd: 'python3 ~/.claude/skills/ghl-api/scripts/contacts.py [ACCOUNT_NAME] list --limit 3' },
    { label: 'List Opportunities', cmd: 'python3 ~/.claude/skills/ghl-api/scripts/opportunities.py [ACCOUNT_NAME] list --limit 5' },
    { label: 'Test Connection', cmd: 'python3 ~/.claude/skills/ghl-api/scripts/accounts.py test [ACCOUNT_NAME]' },
  ]

  const runCommand = async (cmd) => {
    setLoading(true)
    setOutput('')
    try {
      const res = await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      })
      const { stdout, stderr } = await res.json()
      setOutput(stdout || stderr || '(sin salida)')
    } catch (e) {
      setOutput('Error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        🔌 GHL API — {GHL_ACCOUNTS.find(a => a.name === selectedAccount)?.label}
      </h3>

      <div style={{ marginBottom: 12 }}>
        <select
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginRight: 8 }}
        >
          {GHL_ACCOUNTS.map(a => (
            <option key={a.name} value={a.name}>{a.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {quickCommands.map((qc, i) => (
          <button
            key={i}
            onClick={() => runCommand(qc.cmd)}
            disabled={loading}
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            {qc.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="python3 ~/.claude/skills/ghl-api/scripts/..."
          style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'var(--mono)' }}
          onKeyDown={e => e.key === 'Enter' && runCommand(command)}
        />
        <button
          onClick={() => runCommand(command)}
          disabled={loading || !command.trim()}
          style={{ background: loading ? 'var(--border)' : '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳' : 'Run'}
        </button>
      </div>

      {output && (
        <pre style={{ marginTop: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontSize: 11, color: 'var(--text)', maxHeight: 200, overflow: 'auto', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap' }}>
          {output}
        </pre>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Artifacts servidos por el middleware de vite.config.js desde las carpetas
// hermanas ../artifacts, ../assets y ../research de la copia por cliente.
// En el template estos archivos no existen todavía — la pestaña lo avisa.
// ═══════════════════════════════════════════════════════════════════════════
const ARTIFACTS = [
  { file: '01_Strategy_Brief.html', name: 'Strategy Brief', icon: '🧭' },
  { file: '02_Conversation_Flow.html', name: 'Conversation Flow', icon: '💬' },
  { file: '02_Bot_Pipeline_Map.html', name: 'Bot → Pipeline Map', icon: '🗺' },
  { file: '03_Custom_Fields_Table.html', name: 'Custom Fields', icon: '📝' },
  { file: '04_Bot_Agent_Summary.html', name: 'Bot Agent Summary', icon: '🤖' },
  { file: '05_AI_Agent_Actions.html', name: 'AI Agent Actions', icon: '⚙️' },
  { file: '06_Pipeline_Stage_Map.html', name: 'Pipeline Stage Map', icon: '📊' },
  { file: '07_User_Calendar_Config.html', name: 'Users & Calendars', icon: '📅' },
  { file: '08_WhatsApp_Templates.html', name: 'WhatsApp Templates', icon: '📱' },
  { file: '09_Email_Templates.html', name: 'Email Templates', icon: '📧' },
  { file: '10_Workflow_Templates.html', name: 'Workflow Templates', icon: '⚡' },
  { file: '11_Tags_Map.html', name: 'Tags Map', icon: '🏷' },
  { file: '12_Landing_Page_Mockup.html', name: 'Landing Page Mockup', icon: '🖥' },
  { file: '13_Business_Profile_Settings.html', name: 'Business Profile', icon: '🏢' },
  { file: '14_Knowledgebase_Content.html', name: 'Knowledgebase', icon: '📚' },
]

const TABS = [
  { id: 'workflows', icon: '⚡', label: 'Workflows' },
  { id: 'build', icon: '🧱', label: 'Build' },
  { id: 'api', icon: '🔌', label: 'Api' },
  { id: 'artifacts', icon: '📄', label: 'Artifacts' },
  { id: 'docs', icon: '🗂', label: 'Docs' },
]

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const [selectedWf, setSelectedWf] = useState(() => {
    const n = parseInt(params.get('wf'), 10)
    return n >= 1 && n <= WORKFLOWS.length ? n : 1
  })
  const [activeTab, setActiveTab] = useState(() => {
    const t = params.get('tab')
    return TABS.some(x => x.id === t) ? t : 'workflows'
  })
  const [viewMode, setViewMode] = useState('canvas') // 'canvas' (Advanced) | 'list' (Standard)
  const [published, setPublished] = useState(false) // decorativo, paridad visual con GHL
  const [theme, setTheme] = useState(() => localStorage.getItem('hl-theme') || 'light')
  const [artifact, setArtifact] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('hl-theme', theme)
  }, [theme])

  const wf = WORKFLOWS.find(w => w.id === selectedWf)
  const chains = wf ? wf.builder(PIPELINE) : []

  const tabBtn = (tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      style={{
        background: activeTab === tab.id ? 'var(--primary-tint)' : 'transparent',
        color: activeTab === tab.id ? 'var(--primary-soft)' : 'var(--text-muted)',
        border: `1px solid ${activeTab === tab.id ? 'var(--primary)' : 'transparent'}`,
        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {tab.icon} {tab.label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--font)' }}>
      {/* ── Top bar: nombre + tabs + Draft/Publish + tema (anatomía GHL) ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, boxShadow: 'var(--shadow-sm)', zIndex: 5 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }} title={`WF ${wf.id}: ${wf.name}`}>
            ⚡ WF {wf.id}: {wf.name}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>{PIPELINE.brandName} · {PIPELINE.locationId}</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {TABS.map(tabBtn)}

          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 6px' }} />

          {/* Toggle Draft/Publish — decorativo, misma paridad visual que GHL */}
          <button
            onClick={() => setPublished(p => !p)}
            title="Decorativo — el publish real se hace en GHL"
            style={{
              display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px 4px 6px',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              color: published ? '#3fb950' : 'var(--text-muted)',
            }}
          >
            <span style={{ width: 26, height: 14, borderRadius: 8, background: published ? '#3fb950' : 'var(--border-strong)', position: 'relative', transition: 'background .15s' }}>
              <span style={{ position: 'absolute', top: 2, left: published ? 14 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
            </span>
            {published ? 'Publish' : 'Draft'}
          </button>

          <button
            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
            title="Cambiar tema"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'workflows' && (
          <>
            {/* Sidebar izquierda — lista de workflows (como el Workflow Switcher de GHL) */}
            <div style={{ width: 230, background: 'var(--surface)', borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto', padding: '12px 8px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 8 }}>Workflows (13)</div>
              {WORKFLOWS.map(w => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWf(w.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', marginBottom: 4,
                    background: selectedWf === w.id ? 'var(--primary-tint)' : 'transparent',
                    border: `1px solid ${selectedWf === w.id ? 'var(--primary)' : 'transparent'}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: selectedWf === w.id ? 'var(--primary-soft)' : 'var(--text)' }}>WF {w.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{w.name}</div>
                </button>
              ))}
            </div>

            {/* Área principal */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Sub-header: info del workflow + toggle Standard/Advanced (como GHL) */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'var(--primary-tint)', color: 'var(--primary-soft)', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>{WF_INFO[wf.id].count}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--primary-soft)' }}>Trigger:</strong> {WF_INFO[wf.id].trigger}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{WF_INFO[wf.id].desc}</div>
                </div>
                <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
                  {[
                    { id: 'canvas', label: '🗺 Canvas' },
                    { id: 'list', label: '☰ Lista' },
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setViewMode(v.id)}
                      style={{
                        background: viewMode === v.id ? 'var(--surface)' : 'transparent',
                        color: viewMode === v.id ? 'var(--text)' : 'var(--text-muted)',
                        border: 'none', boxShadow: viewMode === v.id ? 'var(--shadow-sm)' : 'none',
                        borderRadius: 6, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === 'canvas' ? (
                <FlowCanvas
                  chains={chains}
                  nodeHowto={NODE_HOWTO}
                  renderPreview={(node) => <NodeFieldsPreview node={node} />}
                />
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    💡 <strong style={{ color: 'var(--text)' }}>Click</strong> en cada nodo para ver configuración · Ramas <span style={{ color: '#3fb950' }}>YES</span> / <span style={{ color: '#f85149' }}>NO</span> se expanden al hacer click
                  </div>
                  <WorkflowView chains={chains} />
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'build' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🧱 Build Mode — paso a paso</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Elegí un workflow y armalo nodo por nodo en el builder visual de GHL. El progreso se guarda en este navegador.
            </p>
            <BuildWizard selectedWf={selectedWf} onSelectWf={setSelectedWf} />
          </div>
        )}

        {activeTab === 'api' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🔌 GHL API Integration</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
              Run commands against your GHL account. Scripts located at <code style={{ color: '#58a6ff', fontFamily: 'var(--mono)' }}>~/.claude/skills/ghl-api/scripts/</code>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {[
                { name: 'workflows.py', desc: 'List, get, trigger, remove workflows', icon: '⚡' },
                { name: 'contacts.py', desc: 'CRUD contacts, search, tags', icon: '👥' },
                { name: 'opportunities.py', desc: 'Manage pipeline and deals', icon: '💼' },
                { name: 'conversations.py', desc: 'SMS, WhatsApp, email messages', icon: '💬' },
                { name: 'emails.py', desc: 'Email templates, send emails', icon: '📧' },
                { name: 'custom_fields.py', desc: 'Contact and opp custom fields', icon: '📝' },
              ].map((script, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{script.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{script.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{script.desc}</div>
                </div>
              ))}
            </div>
            <GhlApiPanel selectedWf={selectedWf} />
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <div style={{ width: 280, background: 'var(--surface)', borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto', padding: '14px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 8 }}>Configuration Artifacts</div>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', padding: '0 8px', marginBottom: 12, lineHeight: 1.5 }}>
                Servidos desde <code style={{ fontFamily: 'var(--mono)' }}>../artifacts</code> de la copia por cliente. En el template genérico todavía no existen.
              </p>
              {ARTIFACTS.map(a => (
                <div key={a.file} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <button
                    onClick={() => setArtifact(a)}
                    style={{
                      flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      background: artifact?.file === a.file ? 'var(--primary-tint)' : 'transparent',
                      border: `1px solid ${artifact?.file === a.file ? 'var(--primary)' : 'transparent'}`,
                      borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                      color: artifact?.file === a.file ? 'var(--primary-soft)' : 'var(--text)',
                    }}
                  >
                    <span>{a.icon}</span> {a.name}
                  </button>
                  <a
                    href={`/artifacts/${a.file}`} target="_blank" rel="noreferrer" title="Abrir en pestaña nueva"
                    style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-faint)', textDecoration: 'none' }}
                  >↗</a>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: 'var(--bg)', display: 'flex' }}>
              {artifact ? (
                <iframe
                  key={artifact.file}
                  src={`/artifacts/${artifact.file}`}
                  title={artifact.name}
                  style={{ flex: 1, border: 'none', background: '#fff' }}
                />
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-faint)' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13 }}>Elegí un artifact de la lista para previsualizarlo acá</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'var(--bg)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🗂 Workflow Documentation</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {WORKFLOWS.map(w => (
                <div key={w.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }} onClick={() => { setSelectedWf(w.id); setActiveTab('workflows'); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>WF {w.id}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{w.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{WF_INFO[w.id].desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
