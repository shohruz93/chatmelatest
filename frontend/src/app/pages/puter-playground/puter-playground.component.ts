import { Component, OnInit, signal, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-puter-playground',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-page">

      <!-- Ambient glows -->
      <div class="glow glow-top"></div>
      <div class="glow glow-bottom"></div>

      <div class="ai-container">

        <!-- Header -->
        <div class="ai-header">
          <div class="ai-badge">🪄 Суҳбат бо ИИ</div>
          <h1 class="ai-title">AI Assistant</h1>
          <p class="ai-subtitle">Llama 3.3 70B · Groq · Streaming</p>
        </div>

        <!-- Chat Card -->
        <div class="chat-card">

          <!-- Messages -->
          <div class="messages-area" #chatContainer>

            <div class="empty-state" *ngIf="chatHistory.length === 0">
              <div class="empty-icon">🤖</div>
              <p class="empty-title">Бо ИИ суҳбат оғоз кунед</p>
              <p class="empty-sub">Ҳар гуна савол, иттилоот ё дархост нависед</p>
            </div>

            <div *ngFor="let msg of chatHistory"
                 class="message"
                 [class.user-msg]="msg.role === 'user'"
                 [class.ai-msg]="msg.role === 'ai'">
              <div *ngIf="msg.role === 'ai'" class="ai-label">
                <span class="ai-dot"></span> AI · Llama 3.3 70B
              </div>
              <div class="msg-bubble" [innerHTML]="msg.content"></div>
              <span *ngIf="msg.isStreaming" class="cursor-blink"></span>
            </div>

            <!-- Thinking dots -->
            <div *ngIf="isChatting && isWaitingForStream" class="message ai-msg">
              <div class="ai-label"><span class="ai-dot"></span> AI is thinking...</div>
              <div class="msg-bubble thinking-dots">
                <span></span><span></span><span></span>
              </div>
            </div>

          </div>

          <!-- Input Row -->
          <div class="input-row">
            <div class="input-wrapper">
              <textarea
                [(ngModel)]="chatInput"
                (keydown.enter)="onEnter($any($event))"
                placeholder="Паёми худро нависед... (Enter = Фиристодан)"
                rows="1"
                class="chat-input"
                (input)="autoResize($event)">
              </textarea>
            </div>
            <button
              class="send-btn"
              (click)="sendChat()"
              [disabled]="isChatting || !chatInput.trim()">
              <span *ngIf="!isChatting" class="send-icon">↑</span>
              <span *ngIf="isChatting" class="spinner"></span>
            </button>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .ai-page {
      position: fixed;
      inset: 0;
      background: #080c14;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 0;
    }
    .glow-top {
      width: 480px; height: 480px;
      top: -100px; left: 10%;
      background: radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%);
    }
    .glow-bottom {
      width: 400px; height: 400px;
      bottom: 0; right: 5%;
      background: radial-gradient(circle, rgba(59,130,246,0.14), transparent 70%);
    }

    .ai-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
      padding: 1.25rem 1rem 1rem;
      box-sizing: border-box;
      gap: 1rem;
    }

    /* ── Header ── */
    .ai-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
    }

    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.9rem;
      border-radius: 9999px;
      background: rgba(168,85,247,0.12);
      border: 1px solid rgba(168,85,247,0.25);
      color: #c084fc;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .ai-title {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 900;
      color: white;
      letter-spacing: -0.02em;
    }

    .ai-subtitle {
      margin: 0;
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    /* ── Chat Card ── */
    .chat-card {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: rgba(15,23,42,0.7);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 1.5rem;
      border: 1px solid rgba(51,65,85,0.5);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
      overflow: hidden;
    }

    /* ── Messages ── */
    .messages-area {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      scroll-behavior: smooth;
    }

    .messages-area::-webkit-scrollbar { width: 4px; }
    .messages-area::-webkit-scrollbar-track { background: transparent; }
    .messages-area::-webkit-scrollbar-thumb {
      background: rgba(168,85,247,0.35);
      border-radius: 10px;
    }

    /* ── Empty State ── */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      color: #475569;
      text-align: center;
      padding: 3rem 1rem;
    }
    .empty-icon { font-size: 3rem; }
    .empty-title { margin: 0; font-size: 1rem; font-weight: 600; color: #64748b; }
    .empty-sub   { margin: 0; font-size: 0.82rem; color: #334155; }

    /* ── Messages ── */
    .message {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      max-width: 78%;
      animation: fadeUp 0.25s ease forwards;
    }

    .user-msg {
      align-self: flex-end;
      align-items: flex-end;
    }
    .ai-msg {
      align-self: flex-start;
      align-items: flex-start;
    }

    .ai-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #a855f7;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .ai-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #a855f7;
      display: inline-block;
      box-shadow: 0 0 6px #a855f7;
    }

    .msg-bubble {
      padding: 0.8rem 1.1rem;
      border-radius: 1.1rem;
      font-size: 0.95rem;
      line-height: 1.65;
      word-break: break-word;
    }

    .user-msg .msg-bubble {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: white;
      border-radius: 1.1rem 1.1rem 0.25rem 1.1rem;
      box-shadow: 0 4px 20px rgba(124,58,237,0.3);
    }
    .ai-msg .msg-bubble {
      background: rgba(30,41,59,0.9);
      color: #e2e8f0;
      border-radius: 1.1rem 1.1rem 1.1rem 0.25rem;
      border: 1px solid rgba(51,65,85,0.6);
    }

    /* ── Thinking dots ── */
    .thinking-dots {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0.75rem 1.1rem;
    }
    .thinking-dots span {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #7c3aed;
      display: inline-block;
      animation: bounce 1.2s infinite;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.30s; }

    /* ── Streaming cursor ── */
    .cursor-blink {
      display: inline-block;
      width: 8px; height: 17px;
      background: #a855f7;
      border-radius: 2px;
      margin-left: 3px;
      vertical-align: middle;
      animation: blink 0.9s infinite;
    }

    /* ── Input ── */
    .input-row {
      display: flex;
      align-items: flex-end;
      gap: 0.6rem;
      padding: 1rem 1.25rem 1.25rem;
      border-top: 1px solid rgba(51,65,85,0.4);
      background: rgba(11,15,25,0.5);
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    .chat-input {
      width: 100%;
      background: rgba(15,23,42,0.8);
      border: 1.5px solid rgba(71,85,105,0.6);
      border-radius: 0.9rem;
      color: white;
      font-size: 0.95rem;
      padding: 0.75rem 1rem;
      resize: none;
      outline: none;
      font-family: inherit;
      line-height: 1.5;
      min-height: 46px;
      max-height: 140px;
      overflow-y: auto;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chat-input:focus {
      border-color: rgba(168,85,247,0.7);
      box-shadow: 0 0 0 3px rgba(168,85,247,0.12);
    }
    .chat-input::placeholder { color: #475569; }

    .send-btn {
      width: 46px; height: 46px;
      border-radius: 0.85rem;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: none;
      color: white;
      font-size: 1.15rem;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.15s, opacity 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(124,58,237,0.4);
    }
    .send-btn:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(124,58,237,0.5);
    }
    .send-btn:active:not(:disabled) { transform: scale(0.95); }
    .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .send-icon { line-height: 1; }

    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    /* ── Animations ── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.65); opacity: 0.4; }
      40%            { transform: scale(1);    opacity: 1;   }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      .ai-container { padding: 0.75rem 0.6rem 0.6rem; gap: 0.6rem; }
      .ai-title { font-size: 1.25rem; }
      .message { max-width: 90%; }
      .messages-area { padding: 1rem; gap: 0.85rem; }
      .input-row { padding: 0.75rem 0.75rem 1rem; }
      .chat-input { font-size: 0.9rem; }
      .glow-top { width: 260px; height: 260px; }
      .glow-bottom { width: 220px; height: 220px; }
    }
  `]
})
export class PuterPlaygroundComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  chatInput = '';
  chatHistory: { role: string; content: string; isStreaming?: boolean }[] = [];
  isChatting = false;
  isWaitingForStream = false;

  private shouldScroll = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendChat();
    }
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  async sendChat() {
    const text = this.chatInput.trim();
    if (!text || this.isChatting) return;

    this.chatHistory.push({ role: 'user', content: text });
    this.chatInput = '';
    this.isChatting = true;
    this.isWaitingForStream = true;
    this.shouldScroll = true;
    this.cdr.detectChanges();

    // reset textarea height
    setTimeout(() => {
      const el = document.querySelector('.chat-input') as HTMLTextAreaElement;
      if (el) { el.style.height = 'auto'; }
    });

    const apiKey = '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';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    try {
      const messages = this.chatHistory
        .filter(m => !m.isStreaming)
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.content.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
        }));

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || 'Хатогӣ ҳангоми пайвастшавӣ');
      }

      this.isWaitingForStream = false;
      this.chatHistory.push({ role: 'ai', content: '', isStreaming: true });
      const aiIdx = this.chatHistory.length - 1;
      this.shouldScroll = true;
      this.cdr.detectChanges();

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const t = line.trim();
          if (t.startsWith('data: ') && t !== 'data: [DONE]') {
            try {
              const delta = JSON.parse(t.slice(6))?.choices?.[0]?.delta?.content;
              if (delta) {
                this.chatHistory[aiIdx].content += delta.replace(/\n/g, '<br>');
                this.shouldScroll = true;
                this.cdr.detectChanges();
              }
            } catch {}
          }
        }
      }

      this.chatHistory[aiIdx].isStreaming = false;

    } catch (e: any) {
      this.isWaitingForStream = false;
      this.chatHistory.push({
        role: 'ai',
        content: `<span style="color:#f87171">⚠️ Хатогӣ: ${e.message}</span>`
      });
    } finally {
      this.isChatting = false;
      this.isWaitingForStream = false;
      this.shouldScroll = true;
      this.cdr.detectChanges();
    }
  }
}
