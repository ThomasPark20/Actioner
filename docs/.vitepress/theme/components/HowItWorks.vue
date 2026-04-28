<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

const messages = [
  { sender: 'user', name: 'You', text: 'Research Scattered Spider\'s latest campaign' },
  { sender: 'bot', name: 'Chat Agent', text: 'On it — spinning up a research thread.', delay: 800 },
  { sender: 'system', text: 'Thread created: Research: Scattered Spider', delay: 600 },
  { sender: 'bot', name: 'Research Agent', text: 'Searching primary sources...', thread: true, delay: 1000 },
  { sender: 'step', text: 'Web search — CrowdStrike, CISA, Microsoft reports', delay: 700 },
  { sender: 'step', text: 'Following links to IOC repos and PDFs', delay: 600 },
  { sender: 'step', text: 'Extracting IOCs — 12 IPs, 8 domains, 3 hashes', delay: 700 },
  { sender: 'step', text: 'Mapping TTPs to MITRE ATT&CK', delay: 500 },
  { sender: 'step', text: 'Generating Sigma rules — validating with sigma-cli', delay: 800 },
  { sender: 'step', text: 'Generating YARA rules — validating with yarac', delay: 600 },
  { sender: 'step', text: 'Generating Snort/Suricata rules — validating with snort', delay: 600 },
  { sender: 'step', text: 'Compiling topic summary with sources', delay: 500 },
  { sender: 'bot', name: 'Research Agent', text: 'Report ready.', thread: true, delay: 400, file: 'scattered-spider-2026-04-03.md' },
  { sender: 'user', name: 'You', text: 'Are any of them on FBI most wanted?', thread: true, delay: 1500 },
  { sender: 'bot', name: 'Chat Agent', text: 'Good question — yes, several members have been indicted by the DOJ. Added to research requirements so the report covers this.', thread: true, delay: 600 },
  { sender: 'user', name: 'You', text: 'Also focus on their SIM swapping TTPs', thread: true, delay: 1200 },
  { sender: 'bot', name: 'Chat Agent', text: 'Added to requirements: focus analysis on SIM swapping techniques and related TTPs. The research agent will address this before delivering the final report.', thread: true, delay: 600 },
  { sender: 'system', text: 'requirements.md updated — 2 items pending', delay: 500 },
  { sender: 'bot', name: 'Research Agent', text: 'Updated report with FBI indictments and SIM swapping analysis. All requirements satisfied.', thread: true, delay: 1200, file: 'scattered-spider-2026-04-03-v2.md' },
]

const visibleMessages = ref([])
const isTyping = ref(false)
const typingName = ref('')
const currentThread = ref(false)
const messagesEl = ref(null)
let timeoutId = null
let currentIndex = 0

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTo({
        top: messagesEl.value.scrollHeight,
        behavior: 'smooth',
      })
    }
  })
}

function showNext() {
  if (currentIndex >= messages.length) {
    // Stop — don't loop
    return
  }

  const msg = messages[currentIndex]
  const delay = msg.delay || 800

  if (msg.sender === 'bot' || (msg.sender === 'user' && currentIndex > 0)) {
    isTyping.value = true
    typingName.value = msg.name
    scrollToBottom()
    timeoutId = setTimeout(() => {
      isTyping.value = false
      if (msg.thread) currentThread.value = true
      visibleMessages.value.push({ ...msg, id: currentIndex })
      currentIndex++
      scrollToBottom()
      timeoutId = setTimeout(showNext, 400)
    }, delay)
  } else {
    visibleMessages.value.push({ ...msg, id: currentIndex })
    currentIndex++
    scrollToBottom()
    timeoutId = setTimeout(showNext, delay)
  }
}

onMounted(() => {
  timeoutId = setTimeout(showNext, 1000)
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="demo-container">
    <div class="demo-window">
      <div class="demo-header">
        <div class="demo-dots">
          <span></span><span></span><span></span>
        </div>
        <div class="demo-title">
          <span v-if="!currentThread" class="channel-name"># threat-intel</span>
          <span v-else class="channel-name">🧵 Research: Scattered Spider</span>
        </div>
        <div class="demo-dots" style="visibility: hidden;">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div ref="messagesEl" class="demo-messages">
        <TransitionGroup name="msg">
          <div
            v-for="msg in visibleMessages"
            :key="msg.id"
            :class="['demo-msg', `demo-msg-${msg.sender}`]"
          >
            <template v-if="msg.sender === 'system'">
              <div class="msg-system">{{ msg.text }}</div>
            </template>
            <template v-else-if="msg.sender === 'step'">
              <div class="msg-step">
                <span class="step-check">✓</span> {{ msg.text }}
              </div>
            </template>
            <template v-else>
              <div class="msg-header">
                <span :class="['msg-name', msg.sender === 'bot' ? 'msg-name-bot' : 'msg-name-user']">
                  {{ msg.name }}
                </span>
              </div>
              <div class="msg-text">{{ msg.text }}</div>
              <div v-if="msg.file" class="msg-file">
                <span class="file-icon">📎</span> {{ msg.file }}
              </div>
            </template>
          </div>
        </TransitionGroup>
        <div v-if="isTyping" class="demo-typing">
          <span class="typing-name">{{ typingName }}</span> is typing
          <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  max-width: 620px;
  margin: 2rem auto;
}

.demo-window {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.demo-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.demo-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}

.demo-title {
  text-align: center;
}

.channel-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.demo-messages {
  padding: 20px;
  min-height: 70vh;
  max-height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.demo-msg {
  animation: slideIn 0.3s ease-out;
}

.msg-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.msg-name {
  font-size: 13px;
  font-weight: 700;
}

.msg-name-bot {
  color: var(--vp-c-text-1);
}

.msg-name-user {
  color: var(--vp-c-text-2);
}

.msg-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.msg-file {
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}

.file-icon {
  margin-right: 4px;
}

.msg-system {
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
  padding: 4px 0;
  font-style: italic;
}

.msg-step {
  font-size: 12px;
  color: var(--vp-c-text-2);
  padding-left: 16px;
  line-height: 1.6;
}

.step-check {
  color: #393;
  font-weight: 700;
  margin-right: 4px;
}

.demo-typing {
  font-size: 12px;
  color: var(--vp-c-text-3);
  padding: 4px 0;
}

.typing-name {
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.typing-dots span {
  animation: blink 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.2; }
  30% { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.msg-enter-active {
  transition: all 0.3s ease-out;
}

.msg-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
