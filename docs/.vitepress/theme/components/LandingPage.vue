<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { withBase, useData } from 'vitepress'

const { isDark } = useData()

// ── Chat simulation ──
const messages = [
  { sender: 'user', name: 'Thomas Park', text: 'Research Scattered Spider\'s latest campaign' },
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
  { sender: 'user', name: 'Thomas Park', text: 'Are any of them on FBI most wanted?', thread: true, delay: 1500 },
  { sender: 'bot', name: 'Chat Agent', text: 'Good question — yes, several members have been indicted by the DOJ. Added to research requirements so the report covers this.', thread: true, delay: 600 },
  { sender: 'user', name: 'Thomas Park', text: 'Also focus on their SIM swapping TTPs', thread: true, delay: 1200 },
  { sender: 'bot', name: 'Chat Agent', text: 'Added to requirements: focus analysis on SIM swapping techniques and related TTPs.', thread: true, delay: 600 },
  { sender: 'system', text: 'requirements.md updated — 2 items pending', delay: 500 },
  { sender: 'bot', name: 'Research Agent', text: 'Updated report with FBI indictments and SIM swapping analysis. All requirements satisfied.', thread: true, delay: 1200, file: 'scattered-spider-2026-04-03-v2.md' },
]

const visibleMessages = ref([])
const isTyping = ref(false)
const typingName = ref('')
const currentThread = ref(false)
const chatEl = ref(null)
const heroCanvas = ref(null)
let timeoutId = null
let currentIndex = 0
let chatStarted = false
let animFrameId = null

// ── Particle grid ──
function initParticles() {
  const canvas = heroCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let w, h, particles

  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio
    h = canvas.height = canvas.offsetHeight * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
  }

  function createParticles() {
    const count = Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 12000)
    particles = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      })
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    const connDist = 120

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < connDist) {
          const alpha = (1 - dist / connDist) * 0.15
          ctx.strokeStyle = `rgba(212, 118, 10, ${alpha})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      ctx.fillStyle = `rgba(212, 118, 10, ${0.4 + p.r * 0.15})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()

      // Move
      p.x += p.vx
      p.y += p.vy

      // Wrap
      if (p.x < -10) p.x = canvas.offsetWidth + 10
      if (p.x > canvas.offsetWidth + 10) p.x = -10
      if (p.y < -10) p.y = canvas.offsetHeight + 10
      if (p.y > canvas.offsetHeight + 10) p.y = -10
    }

    animFrameId = requestAnimationFrame(draw)
  }

  resize()
  createParticles()
  draw()

  window.addEventListener('resize', () => {
    resize()
    createParticles()
  })
}

function scrollChat() {
  nextTick(() => {
    if (chatEl.value) {
      chatEl.value.scrollTo({ top: chatEl.value.scrollHeight, behavior: 'smooth' })
    }
  })
}

function showNext() {
  if (currentIndex >= messages.length) return

  const msg = messages[currentIndex]
  const delay = msg.delay || 800

  if (msg.sender === 'bot' || (msg.sender === 'user' && currentIndex > 0)) {
    isTyping.value = true
    typingName.value = msg.name
    scrollChat()
    timeoutId = setTimeout(() => {
      isTyping.value = false
      if (msg.thread) currentThread.value = true
      visibleMessages.value.push({ ...msg, id: currentIndex })
      currentIndex++
      scrollChat()
      timeoutId = setTimeout(showNext, 300)
    }, delay)
  } else {
    visibleMessages.value.push({ ...msg, id: currentIndex })
    currentIndex++
    scrollChat()
    timeoutId = setTimeout(showNext, delay)
  }
}

// ── Research posts ──
const researchPosts = [
  {
    title: 'Axios npm Supply Chain Compromise',
    summary: 'North Korean state-sponsored compromise of axios. Cross-platform RAT via postinstall hook.',
    link: '/Aegis/research/axios-supply-chain',
  },
  {
    title: 'BlueHammer: Windows Defender Zero-Day',
    summary: 'Unpatched TOCTOU race condition in Defender. Full PoC public, no patch.',
    link: '/Aegis/research/bluehammer-zero-day',
  },
  {
    title: 'TeamPCP Supply Chain Campaign',
    summary: 'Cascading compromise of Trivy, KICS, LiteLLM, and 47+ npm packages.',
    link: '/Aegis/research/teampcp-supply-chain-2026',
  },
  {
    title: 'Scattered Spider: Recent Campaigns and Evolving TTPs',
    summary: 'UK retail attacks, aviation targeting, and DragonForce ransomware pivot.',
    link: '/Aegis/research/scattered-spider-2026',
  },
  {
    title: 'Lazarus Group: Threat Actor Profile',
    summary: '$1.5B Bybit heist, Medusa ransomware, developer supply chain attacks.',
    link: '/Aegis/research/lazarus-group-2026',
  },
]

const researchVisible = ref(false)

// ── Scroll-driven sections ──
const sections = [
  {
    id: 'research',
    title: 'Describe a threat. Get a finished report.',
    text: 'Ask Actioner to research any threat. It creates a thread, investigates primary sources, extracts IOCs, maps MITRE ATT&CK TTPs, and delivers a structured report. Send follow-ups while it works: a fast chat agent responds in seconds, the research agent keeps going.',
  },
  {
    id: 'critical',
    title: 'Critical threats trigger immediate research.',
    text: 'RSS feeds scanned every 2 hours. When something critical drops (APTs, zero-days, active exploitation), Actioner wakes up and starts researching before you even see the advisory. Most scans cost nothing.',
  },
  {
    id: 'briefing',
    title: 'Daily briefing, zero effort.',
    text: 'Everything from the last 24 hours, compiled into an executive summary and delivered at your configured time. Top items by severity, IOC counts, detection rules generated. Quiet days get a one-liner.',
  },
  {
    id: 'detection',
    title: 'Detection rules that actually compile.',
    text: 'Sigma, YARA, Snort, and Suricata rules generated and validated with real CLI tools inside the container. Failed rules retry up to 3 times. Nothing is silently dropped.',
  },
]

const visibleSections = ref(new Set())
const heroVisible = ref(true)
const demoVisible = ref(false)
const getRunningVisible = ref(false)
const isMobile = ref(false)

// ── Mobile scroll-driven cards ──
const activeCard = ref(0)
const demoSectionEl = ref(null)

function onScroll() {
  isMobile.value = window.innerWidth <= 768

  // Desktop: check each section for visibility
  if (!isMobile.value) {
    document.querySelectorAll('.scroll-section').forEach((el) => {
      const rect = el.getBoundingClientRect()
      const id = el.dataset.id
      if (rect.top < window.innerHeight * 0.75 && rect.bottom > 0) {
        visibleSections.value.add(id)
      }
    })
  }

  // Mobile: map vertical scroll progress through demo-section to active card index
  if (isMobile.value && demoSectionEl.value) {
    const rect = demoSectionEl.value.getBoundingClientRect()
    const sectionHeight = rect.height
    const scrolled = -rect.top // how far we've scrolled into the section
    const progress = Math.max(0, Math.min(1, scrolled / (sectionHeight - window.innerHeight)))
    activeCard.value = Math.min(
      Math.floor(progress * sections.length),
      sections.length - 1
    )
  }

  // Start chat when demo section is visible
  const demoEl = demoSectionEl.value || document.querySelector('.demo-section')
  if (demoEl) {
    const rect = demoEl.getBoundingClientRect()
    demoVisible.value = rect.top < window.innerHeight * 0.8 && rect.bottom > window.innerHeight * 0.2
    if (demoVisible.value && !chatStarted) {
      chatStarted = true
      timeoutId = setTimeout(showNext, 600)
    }
  }

  // Research section visibility
  const resEl = document.querySelector('.research-section')
  if (resEl) {
    const rect = resEl.getBoundingClientRect()
    researchVisible.value = rect.top < window.innerHeight * 0.7
  }

  // Get Running section visibility — also fade out demo as Get Running enters
  const grEl = document.querySelector('.getrunning-section')
  if (grEl) {
    const rect = grEl.getBoundingClientRect()
    getRunningVisible.value = rect.top < window.innerHeight * 0.7

    // Fade out demo only when Get Running actually enters the viewport
    if (rect.top < window.innerHeight * 0.5) {
      demoVisible.value = false
    }
  }

  // Hero parallax
  const scrollY = window.scrollY
  heroVisible.value = scrollY < window.innerHeight * 0.6
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })
  onScroll()
  initParticles()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (timeoutId) clearTimeout(timeoutId)
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
</script>

<template>
  <div class="landing">
    <!-- Particle background (fixed on mobile, hero-only on desktop) -->
    <canvas ref="heroCanvas" class="hero-particles"></canvas>
    <!-- HERO: full viewport -->
    <section class="hero-section">
      <div class="hero-content" :class="{ 'hero-faded': !heroVisible }">
        <img
          v-if="isDark"
          :src="withBase('/actioner-wordmark-white-4x.png')"
          :srcset="`${withBase('/actioner-wordmark-white-2x.png')} 1x, ${withBase('/actioner-wordmark-white-4x.png')} 2x`"
          alt="Actioner"
          class="hero-logo"
        />
        <img
          v-else
          :src="withBase('/actioner-wordmark-dark-4x.png')"
          :srcset="`${withBase('/actioner-wordmark-dark-2x.png')} 1x, ${withBase('/actioner-wordmark-dark-4x.png')} 2x`"
          alt="Actioner"
          class="hero-logo"
        />
        <p class="hero-text">Threat intelligence that works for you.</p>
        <p class="hero-tagline">Research threats, generate detection rules, deliver reports — all through Discord or Telegram.</p>
        <div class="hero-actions">
          <a href="/Aegis/guide/getting-started" class="btn btn-primary">Get Started</a>
          <a href="/Aegis/architecture" class="btn btn-secondary">Architecture</a>
        </div>
      </div>
      <div class="scroll-hint" :class="{ 'hint-hidden': !heroVisible }">
        <span>scroll</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </section>

    <!-- DEMO: sticky chat + scrolling explanations -->
    <section ref="demoSectionEl" class="demo-section">
      <div class="demo-layout">
        <!-- Sticky chat window -->
        <div class="demo-sticky" :class="{ 'demo-sticky-visible': demoVisible }">
          <div class="chat-window">
            <div class="chat-header">
              <div class="chat-dots"><span></span><span></span><span></span></div>
              <div class="chat-title">
                <span v-if="!currentThread"># threat-intel</span>
                <span v-else>🧵 Research: Scattered Spider</span>
              </div>
              <div class="chat-dots" style="visibility: hidden;"><span></span><span></span><span></span></div>
            </div>
            <div ref="chatEl" class="chat-messages">
              <div v-if="!chatStarted && visibleMessages.length === 0" class="chat-placeholder">
                <p>The simulation will start as you scroll...</p>
              </div>
              <TransitionGroup name="msg">
                <div v-for="msg in visibleMessages" :key="msg.id" class="chat-msg">
                  <template v-if="msg.sender === 'system'">
                    <div class="msg-system">{{ msg.text }}</div>
                  </template>
                  <template v-else-if="msg.sender === 'step'">
                    <div class="msg-step"><span class="step-check">✓</span> {{ msg.text }}</div>
                  </template>
                  <template v-else>
                    <div class="msg-sender">
                      <span :class="msg.sender === 'bot' ? 'name-bot' : 'name-user'">{{ msg.name }}</span>
                    </div>
                    <div class="msg-body">{{ msg.text }}</div>
                    <div v-if="msg.file" class="msg-file">📎 {{ msg.file }}</div>
                  </template>
                </div>
              </TransitionGroup>
              <div v-if="isTyping" class="chat-typing">
                <span class="typing-who">{{ typingName }}</span> is typing
                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: scrolling explanation cards -->
        <div class="demo-scroll">
          <div
            v-for="section in sections"
            :key="section.id"
            :data-id="section.id"
            class="scroll-section"
            :class="{ 'section-visible': visibleSections.has(section.id) }"
          >
            <h3>{{ section.title }}</h3>
            <p>{{ section.text }}</p>
          </div>
        </div>

        <!-- Mobile: stacked cards driven by vertical scroll -->
        <div class="mobile-cards-wrapper">
          <div class="mobile-cards-stack">
            <div
              v-for="(section, i) in sections"
              :key="section.id"
              class="mobile-card"
              :class="{ 'card-active': activeCard === i }"
            >
              <h3>{{ section.title }}</h3>
              <p>{{ section.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- LATEST RESEARCH -->
    <section class="research-section" :class="{ 'research-visible': researchVisible }">
      <h2>Latest Research</h2>
      <p class="research-sub">Threat intelligence reports from Actioner's automated research pipeline.</p>
      <div class="research-grid">
        <a
          v-for="post in researchPosts"
          :key="post.link"
          :href="post.link"
          class="research-card"
        >
          <h3>{{ post.title }}</h3>
          <p>{{ post.summary }}</p>
        </a>
      </div>
      <div class="research-links">
        <a href="/Aegis/research/" class="btn btn-secondary">View All Research</a>
      </div>
    </section>

    <!-- GET RUNNING -->
    <section class="getrunning-section" :class="{ 'getrunning-visible': getRunningVisible }">
      <h2>Get Running</h2>
      <div class="code-block">
        <pre><code>git clone https://github.com/ThomasPark20/Aegis.git
cd Aegis
claude
/setup</code></pre>
      </div>
      <p class="getrunning-sub">Setup handles everything: dependencies, Docker, API keys, Discord bot, feed scanning, and daily reports.</p>
      <div class="getrunning-links">
        <a href="https://github.com/ThomasPark20/Aegis" class="btn btn-primary">GitHub</a>
        <a href="/Aegis/guide/getting-started" class="btn btn-secondary">Full Guide</a>
      </div>
    </section>

  </div>
</template>

<style scoped>
.landing {
  font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-1);
}

/* ── Hero ── */
.hero-section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 2rem;
  position: relative;
}

.hero-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.landing {
  position: relative;
}

.hero-content {
  position: relative;
  z-index: 1;
  transition: opacity 0.5s, transform 0.5s;
}

.hero-faded {
  opacity: 0.3;
  transform: translateY(-20px);
}

.hero-logo {
  width: clamp(280px, 50vw, 520px);
  height: auto;
  margin: 0 auto;
  display: block;
}

.hero-text {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 400;
  color: var(--vp-c-text-2);
  margin: 1rem 0 0.5rem;
  letter-spacing: -0.01em;
}

.hero-tagline {
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: var(--vp-c-text-3);
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 2rem;
}

.btn {
  display: inline-block;
  padding: 0.6rem 1.4rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #D4760A;
  color: #FFFFFF;
  border-radius: 8px;
}

.btn-primary:hover {
  background: #E8943A;
}

.btn-secondary {
  background: transparent;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-text-1);
  border-radius: 8px;
}

.btn-secondary:hover {
  border-color: #D4760A;
  color: #D4760A;
}

.scroll-hint {
  z-index: 1;
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--vp-c-text-3);
  font-size: 12px;
  letter-spacing: 0.1em;
  animation: bounce 2s infinite;
  transition: opacity 0.5s;
}

.hint-hidden { opacity: 0; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

/* ── Demo section ── */
.demo-section {
  min-height: auto;
  padding: 4rem 2rem;
}

.demo-layout {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  gap: 4rem;
  align-items: flex-start;
}

.demo-sticky {
  flex: 1;
  position: sticky;
  top: 50vh;
  transform: translateY(-50%);
  min-width: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.demo-sticky.demo-sticky-visible {
  opacity: 1;
}

.demo-scroll {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14rem;
  padding: 40vh 0 40vh;
  min-width: 0;
}

/* Hide mobile-only elements on desktop */
.mobile-cards-wrapper {
  display: none;
}

/* ── Chat window ── */
.chat-window {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.chat-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.chat-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}

.chat-title {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-1);
}

.chat-messages {
  padding: 20px;
  min-height: 50vh;
  max-height: 50vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.chat-msg {
  animation: slideUp 0.3s ease-out;
}

.msg-sender { margin-bottom: 2px; }

.name-bot {
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.name-user {
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-2);
}

.msg-body {
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
  color: #3AAE5C;
  font-weight: 700;
  margin-right: 4px;
}

.chat-typing {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.typing-who {
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.typing-dots span {
  animation: blink 1.4s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 60%, 100% { opacity: 0.2; }
  30% { opacity: 1; }
}

/* ── Scroll sections ── */
.scroll-section {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.section-visible {
  opacity: 1;
  transform: translateY(0);
}

.scroll-section h3 {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
  color: var(--vp-c-text-1);
}

.scroll-section p {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* ── Research section ── */
.research-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 6rem 2rem;
  text-align: center;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.research-visible {
  opacity: 1;
  transform: translateY(0);
}

.research-section h2 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 0.75rem;
}

.research-sub {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin: 0 0 2.5rem;
}

.research-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  text-align: left;
}

.research-card {
  display: block;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  transition: border-color 0.2s, transform 0.2s;
}

.research-card:hover {
  border-color: #D4760A;
  transform: translateY(-2px);
}

.research-card h3 {
  margin: 0.4rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.research-card p {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.research-tag {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(220, 38, 38, 0.15);
  color: #ef4444;
}

.research-links {
  margin-top: 2rem;
}

/* ── Get Running ── */
.getrunning-section {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.getrunning-visible {
  opacity: 1;
  transform: translateY(0);
}

.getrunning-section h2 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 2rem;
}

.code-block {
  text-align: left;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 0 0 1.5rem;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  word-break: break-all;
  white-space: pre-wrap;
}

.getrunning-sub {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.getrunning-links {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.getrunning-links .btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

/* ── Animations ── */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-enter-active { transition: all 0.3s ease-out; }
.msg-enter-from { opacity: 0; transform: translateY(8px); }

/* ── Mobile ── */
@media (max-width: 768px) {
  .hero-particles {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none;
  }

  .hero-section {
    min-height: 85vh;
    padding-bottom: 4rem;
  }

  .demo-scroll {
    display: none;
  }

  .demo-section {
    min-height: 200svh;
    padding: 0 1rem;
  }

  .demo-layout {
    display: block;
    position: sticky;
    top: 50svh;
    transform: translateY(-50%);
    z-index: 10;
  }

  .demo-sticky {
    position: relative;
    top: auto;
    transform: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    border-radius: 12px;
  }

  .chat-messages {
    min-height: 36svh;
    max-height: 36svh;
  }

  /* Stacked cards below demo */
  .mobile-cards-wrapper {
    display: block;
    padding: 1rem 0.5rem 0;
  }

  .mobile-cards-stack {
    position: relative;
    min-height: 5rem;
  }

  .mobile-card {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .mobile-card.card-active {
    opacity: 1;
    pointer-events: auto;
  }

  .mobile-card h3 {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    color: var(--vp-c-text-1);
  }

  .mobile-card p {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--vp-c-text-2);
    margin: 0;
  }

  .getrunning-section {
    padding: 2rem 1rem;
    min-height: 100svh;
  }

  .code-block {
    padding: 1rem;
  }

  .code-block code {
    font-size: 12px;
  }

  .getrunning-links {
    flex-direction: column;
    align-items: center;
  }
}
</style>
