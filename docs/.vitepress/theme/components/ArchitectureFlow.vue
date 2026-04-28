<script setup>
import { ref } from 'vue'
import { VueFlow, Handle } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { withBase } from 'vitepress'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const selectedNode = ref(null)

const nodes = ref([
  {
    id: 'channels',
    type: 'default',
    position: { x: 340, y: 0 },
    data: { label: 'Discord / Telegram' },
    style: {
      background: '#f5f5f5', border: '2px solid #333', borderRadius: '8px',
      padding: '14px 32px', fontWeight: '600', fontSize: '15px', textAlign: 'center',
    },
  },
  {
    id: 'host',
    position: { x: 180, y: 120 },
    type: 'host',
    data: { label: 'Host Process' },
    style: {
      background: '#2A2A2A', color: '#FFFFFF', border: '2px solid #555', borderRadius: '10px',
      padding: '14px 32px', fontWeight: '700', fontSize: '15px', width: '440px',
      textAlign: 'center',
    },
  },
  {
    id: 'router',
    type: 'default',
    position: { x: 120, y: 220 },
    data: { label: 'Message Router' },
    style: {
      background: '#fafafa', border: '1px solid #ddd', borderRadius: '6px',
      padding: '10px 20px', fontSize: '13px', textAlign: 'center',
    },
  },
  {
    id: 'queue',
    type: 'default',
    position: { x: 340, y: 220 },
    data: { label: 'Group Queue' },
    style: {
      background: '#fafafa', border: '1px solid #ddd', borderRadius: '6px',
      padding: '10px 20px', fontSize: '13px', textAlign: 'center',
    },
  },
  {
    id: 'scheduler',
    type: 'default',
    position: { x: 120, y: 300 },
    data: { label: 'Task Scheduler' },
    style: {
      background: '#fafafa', border: '1px solid #ddd', borderRadius: '6px',
      padding: '10px 20px', fontSize: '13px', textAlign: 'center',
    },
  },
  {
    id: 'ipc',
    type: 'default',
    position: { x: 340, y: 300 },
    data: { label: 'IPC Watcher' },
    style: {
      background: '#fafafa', border: '1px solid #ddd', borderRadius: '6px',
      padding: '10px 20px', fontSize: '13px', textAlign: 'center',
    },
  },

  // Main Agent
  {
    id: 'main',
    type: 'default',
    position: { x: 0, y: 460 },
    data: { label: 'Main Agent' },
    style: {
      background: '#fff', border: '2px solid #333', borderRadius: '10px',
      padding: '14px 24px', fontWeight: '600', fontSize: '14px', width: '220px',
      textAlign: 'center',
    },
  },
  {
    id: 'main-detail',
    type: 'default',
    position: { x: 0, y: 530 },
    data: { label: 'Claude Code + sigma-cli\n+ yarac + snort\n\nIPC: send_message, send_file,\nschedule_task,\nstart_research_thread' },
    style: {
      background: '#fafafa', border: '1px dashed #ccc', borderRadius: '8px',
      padding: '12px 16px', fontSize: '11px', width: '220px', whiteSpace: 'pre-wrap',
      color: '#666', lineHeight: '1.5', textAlign: 'center',
    },
  },

  // Chat Agent
  {
    id: 'chat',
    type: 'default',
    position: { x: 290, y: 460 },
    data: { label: 'Thread-Chat Agent' },
    style: {
      background: '#fff', border: '2px solid #333', borderRadius: '10px',
      padding: '14px 24px', fontWeight: '600', fontSize: '14px', width: '220px',
      textAlign: 'center',
    },
  },
  {
    id: 'chat-detail',
    type: 'default',
    position: { x: 290, y: 530 },
    data: { label: 'Lightweight — answers Q&A\n\nWrites to requirements.md\nReads research workspace\nExits after one response' },
    style: {
      background: '#fafafa', border: '1px dashed #ccc', borderRadius: '8px',
      padding: '12px 16px', fontSize: '11px', width: '220px', whiteSpace: 'pre-wrap',
      color: '#666', lineHeight: '1.5', textAlign: 'center',
    },
  },

  // Research Agent
  {
    id: 'research',
    type: 'default',
    position: { x: 580, y: 460 },
    data: { label: 'Research Agent' },
    style: {
      background: '#fff', border: '2px solid #333', borderRadius: '10px',
      padding: '14px 24px', fontWeight: '600', fontSize: '14px', width: '240px',
      textAlign: 'center',
    },
  },
  {
    id: 'research-detail',
    type: 'default',
    position: { x: 580, y: 530 },
    data: { label: 'Claude Code + sigma-cli\n+ yarac + snort\n\nIPC: send_message, send_file,\nschedule_task\n\nChecks requirements.md\nbefore delivery' },
    style: {
      background: '#fafafa', border: '1px dashed #ccc', borderRadius: '8px',
      padding: '12px 16px', fontSize: '11px', width: '240px', whiteSpace: 'pre-wrap',
      color: '#666', lineHeight: '1.5', textAlign: 'center',
    },
  },
])

const edges = ref([
  { id: 'e-channels-host', source: 'channels', target: 'host', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
  { id: 'e-router-queue', source: 'router', target: 'queue', style: { stroke: '#999' } },
  { id: 'e-scheduler-queue', source: 'scheduler', target: 'queue', style: { stroke: '#999' } },
  { id: 'e-ipc-channels', source: 'ipc', target: 'channels', style: { stroke: '#999', strokeDasharray: '5,5' }, label: 'outbound' },
  { id: 'e-queue-main', source: 'queue', target: 'main', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
  { id: 'e-queue-chat', source: 'queue', target: 'chat', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
  { id: 'e-queue-research', source: 'queue', target: 'research', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
  {
    id: 'e-chat-research', source: 'chat', target: 'research',
    style: { stroke: '#e44', strokeDasharray: '6,4', strokeWidth: 2 },
    label: 'requirements.md', labelStyle: { fontSize: '12px', fontWeight: '600', fill: '#e44' },
  },
  // Agent → detail edges
  { id: 'e-main-detail', source: 'main', target: 'main-detail', style: { stroke: '#ccc', strokeWidth: 1 } },
  { id: 'e-chat-detail', source: 'chat', target: 'chat-detail', style: { stroke: '#ccc', strokeWidth: 1 } },
  { id: 'e-research-detail', source: 'research', target: 'research-detail', style: { stroke: '#ccc', strokeWidth: 1 } },
])

const nodeDetails = {
  main: {
    title: 'Main Agent Container',
    items: [
      'Handles messages in the main Discord/Telegram channel',
      'Dispatches research via start_research_thread IPC',
      'Full tooling: sigma-cli, yarac, snort',
      'Mounts: project (RO), group (RW), global (RO), IPC (RW)',
    ],
  },
  chat: {
    title: 'Thread-Chat Agent Container',
    items: [
      'Spawns when user sends a follow-up in a research thread',
      'Responds in seconds — answers questions or adds requirements',
      'Writes to requirements.md in shared research folder',
      'Exits after first response to free the slot',
      'Mounts: own group (RW), research folder (RW), global (RO)',
    ],
  },
  research: {
    title: 'Research Agent Container',
    items: [
      'Deep investigation: web search, IOC extraction, TTP mapping',
      'Generates and validates Sigma, YARA, Snort rules',
      'Checks requirements.md before delivering final report',
      'All requirements must be addressed before delivery',
      'Mounts: group (RW), global (RO), IPC (RW)',
    ],
  },
}

function onNodeClick(event) {
  const id = event.node.id
  if (nodeDetails[id]) {
    selectedNode.value = nodeDetails[id]
  } else {
    selectedNode.value = null
  }
}
</script>

<template>
  <div style="width: 100%; height: 720px; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; position: relative;">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :nodes-draggable="true"
      :zoom-on-scroll="true"
      :pan-on-drag="true"
      :fit-view-on-init="true"
      :max-zoom="1.5"
      :min-zoom="0.3"
      @node-click="onNodeClick"
    >
      <template #node-host="{ data }">
        <Handle type="target" :position="'top'" />
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <img :src="withBase('/favicon/favicon-dark.png')" alt="" style="height: 32px; width: 32px; border-radius: 4px;" />
          <span>{{ data.label }}</span>
        </div>
        <Handle type="source" :position="'bottom'" />
      </template>
      <Background />
      <Controls position="bottom-right" />
    </VueFlow>
    <transition name="fade">
      <div
        v-if="selectedNode"
        style="position: absolute; top: 16px; right: 16px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 20px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10;"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="font-size: 14px;">{{ selectedNode.title }}</strong>
          <button @click="selectedNode = null" style="background: none; border: none; cursor: pointer; font-size: 18px; color: var(--vp-c-text-3); padding: 0 4px;">&times;</button>
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--vp-c-text-2); line-height: 1.7;">
          <li v-for="item in selectedNode.items" :key="item" style="margin-bottom: 4px;">{{ item }}</li>
        </ul>
      </div>
    </transition>
  </div>
  <p style="font-size: 12px; color: var(--vp-c-text-3); margin-top: 8px; text-align: center;">
    Click a container node for details. Drag to rearrange. Scroll to zoom.
  </p>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
