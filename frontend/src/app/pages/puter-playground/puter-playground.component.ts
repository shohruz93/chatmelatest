import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var puter: any;

@Component({
  selector: 'app-puter-playground',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in-up pb-10 max-w-7xl mx-auto">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider uppercase mb-4">
            <i class="fi fi-rr-magic-wand"></i>
            Суҳбат бо ИИ
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">AI Playground</h2>
          <p class="text-slate-500 dark:text-slate-400 mt-2 text-lg">Ҳамаи имкониятҳои зеҳни маснӯиро дар як ҷо таҷриба кунед.</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex flex-wrap gap-4 p-2 bg-white/60 dark:bg-[#111827]/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800/50 w-max relative z-10 shadow-sm">
        <button *ngFor="let tab of tabs" 
                (click)="activeTab.set(tab.id)"
                [class.bg-gradient-to-r]="activeTab() === tab.id"
                [class.from-purple-500]="activeTab() === tab.id"
                [class.to-purple-600]="activeTab() === tab.id"
                [class.text-white]="activeTab() === tab.id"
                [class.shadow-lg]="activeTab() === tab.id"
                [class.text-slate-600]="activeTab() !== tab.id"
                [class.dark:text-slate-400]="activeTab() !== tab.id"
                class="px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 hover:text-purple-500 dark:hover:text-white">
            <i [class]="tab.icon"></i>
            {{ tab.name }}
        </button>
      </div>

      <!-- Active Content Section -->
      <div class="relative bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-10 shadow-xl border border-slate-200 dark:border-slate-800/50 overflow-hidden min-h-[500px]">
         
         <!-- Background glow -->
         <div class="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

         <!-- 1. AI CHAT TAB -->
         <div *ngIf="activeTab() === 'chat'" class="relative z-10 h-full flex flex-col animate-fade-in-up">
            <div class="mb-6">
              <h3 class="text-2xl font-black text-slate-800 dark:text-white mb-2">Суҳбат (Text Generation)</h3>
              <p class="text-slate-500 dark:text-slate-400">Ҳар саволе доред аз ИИ пурсед.</p>
            </div>
            
            <div class="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
                <div *ngIf="chatHistory.length === 0" class="text-center text-slate-400 dark:text-slate-500 my-auto">
                    <i class="fi fi-rr-robot text-5xl mb-4 block opacity-50"></i>
                    Суҳбатро оғоз кунед...
                </div>
                
                <div *ngFor="let msg of chatHistory" 
                     class="max-w-[85%] p-4 rounded-2xl shadow-sm"
                     [ngClass]="msg.role === 'user' ? 'bg-purple-600 text-white self-end rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 self-start rounded-tl-sm border border-slate-100 dark:border-slate-700'">
                    {{ msg.content }}
                </div>

                <div *ngIf="isChatting" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 self-start p-4 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-700 w-24 flex justify-center items-center gap-2 shadow-sm">
                    <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                    <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                    <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
                </div>
            </div>

            <div class="flex gap-4">
               <input type="text" [(ngModel)]="chatInput" (keyup.enter)="sendChat()"
                      placeholder="Паёми худро нависед..." 
                      class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-6 py-4 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm">
               <button (click)="sendChat()" [disabled]="isChatting || !chatInput.trim()"
                       class="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-8 font-bold transition-all shadow-lg flex items-center justify-center hover:-translate-y-0.5">
                   <i class="fi fi-rr-paper-plane"></i>
               </button>
            </div>
         </div>

         <!-- 2. AI IMAGE TAB -->
         <div *ngIf="activeTab() === 'image'" class="relative z-10 h-full flex flex-col animate-fade-in-up">
            <div class="mb-6">
              <h3 class="text-2xl font-black text-slate-800 dark:text-white mb-2">Сохтани Расм (Txt2Img)</h3>
              <p class="text-slate-500 dark:text-slate-400">Бо истифода аз матн расмҳои баландсифат созед.</p>
            </div>

            <div class="flex flex-col md:flex-row gap-8">
               <div class="w-full md:w-1/3 space-y-6">
                  <div>
                     <label class="block text-slate-600 dark:text-slate-400 text-sm font-bold mb-2">Матни расм</label>
                     <textarea [(ngModel)]="imagePrompt" rows="6"
                               placeholder="Масалан: Як гурбаи кайҳонавард дар рӯи моҳтоб..."
                               class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none shadow-sm"></textarea>
                  </div>
                  <button (click)="generateImage()" [disabled]="isGeneratingImage || !imagePrompt.trim()"
                          class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl px-6 py-4 font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                      <i *ngIf="!isGeneratingImage" class="fi fi-rr-picture"></i>
                      <span *ngIf="isGeneratingImage" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {{ isGeneratingImage ? 'Дар ҳоли сохтан...' : 'Сохтани Расм' }}
                  </button>
               </div>

               <div class="w-full md:w-2/3 flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden min-h-[400px] shadow-inner relative">
                   <div *ngIf="!generatedImageUrl && !isGeneratingImage" class="text-slate-400 dark:text-slate-500 text-center">
                      <i class="fi fi-rr-image-polaroid text-6xl mb-4 block opacity-30"></i>
                      Расми сохташуда дар ин ҷо пайдо мешавад
                   </div>
                   <div *ngIf="isGeneratingImage" class="text-purple-500 text-center flex flex-col items-center">
                      <div class="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                      Эҷоди шоҳасар...
                   </div>
                   <img *ngIf="generatedImageUrl && !isGeneratingImage" [src]="generatedImageUrl" class="w-full h-full object-contain">
                   
                   <a *ngIf="generatedImageUrl && !isGeneratingImage" [href]="generatedImageUrl" download="ai-image.jpg"
                      class="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur text-white p-3 rounded-xl hover:bg-purple-600 transition-colors shadow-lg">
                      <i class="fi fi-rr-download text-xl"></i>
                   </a>
               </div>
            </div>
         </div>

         <!-- 3. AI SPEECH TAB -->
         <div *ngIf="activeTab() === 'speech'" class="relative z-10 h-full flex flex-col animate-fade-in-up">
            <div class="mb-6">
              <h3 class="text-2xl font-black text-slate-800 dark:text-white mb-2">Матн ба Овоз (TTS)</h3>
              <p class="text-slate-500 dark:text-slate-400">Матнро ба овози табиӣ табдил диҳед.</p>
            </div>

            <div class="max-w-2xl mx-auto w-full space-y-8 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <div>
                  <label class="block text-slate-600 dark:text-slate-400 text-sm font-bold mb-2">Матн барои хондан</label>
                  <textarea [(ngModel)]="speechText" rows="5"
                            placeholder="Салом! Хуш омадед ба бахши ҳуши маснӯӣ..."
                            class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none shadow-sm"></textarea>
               </div>

               <div class="flex justify-center">
                  <button (click)="generateSpeech()" [disabled]="isGeneratingSpeech || !speechText.trim()"
                          class="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-full px-10 py-4 font-bold shadow-lg shadow-teal-500/20 transition-all flex items-center gap-3 text-lg hover:-translate-y-0.5">
                      <i *ngIf="!isGeneratingSpeech" class="fi fi-rr-microphone"></i>
                      <span *ngIf="isGeneratingSpeech" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {{ isGeneratingSpeech ? 'Дар ҳоли табдил...' : 'Садоро гӯш кунед' }}
                  </button>
               </div>
               
               <div *ngIf="audioUrl" class="mt-8 flex flex-col items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-teal-500/20 shadow-sm">
                  <span class="text-teal-600 dark:text-teal-400 font-bold text-sm tracking-widest uppercase">Овози сохташуда</span>
                  <audio [src]="audioUrl" controls class="w-full"></audio>
               </div>
            </div>
         </div>

      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(168, 85, 247, 0.3); border-radius: 20px; }
  `]
})
export class PuterPlaygroundComponent {

  tabs = [
    { id: 'chat', name: 'AI Chat', icon: 'fi fi-rr-comment-alt' },
    { id: 'image', name: 'AI Image', icon: 'fi fi-rr-picture' },
    { id: 'speech', name: 'AI Speech', icon: 'fi fi-rr-microphone' }
  ];

  activeTab = signal('chat');

  // Chat State
  chatInput = '';
  chatHistory: {role: string, content: string}[] = [];
  isChatting = false;

  // Image State
  imagePrompt = '';
  generatedImageUrl: string | null = null;
  isGeneratingImage = false;

  // Speech State
  speechText = '';
  audioUrl: string | null = null;
  isGeneratingSpeech = false;

  constructor() {}

  ngOnInit() {
      if (typeof puter !== 'undefined') {
          puter.quiet = true;
      }
  }

  // --- Chat ---
  async sendChat() {
    if (!this.chatInput.trim() || typeof puter === 'undefined') return;
    
    this.chatHistory.push({ role: 'user', content: this.chatInput });
    const prompt = this.chatInput;
    this.chatInput = '';
    this.isChatting = true;

    try {
        const response = await puter.ai.chat(prompt);
        let text = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
        this.chatHistory.push({ role: 'ai', content: text });
    } catch (e: any) {
        this.chatHistory.push({ role: 'ai', content: 'Хатогӣ: ' + e.message });
    } finally {
        this.isChatting = false;
    }
  }

  // --- Image ---
  async generateImage() {
    if (!this.imagePrompt.trim() || typeof puter === 'undefined') return;
    
    this.isGeneratingImage = true;
    this.generatedImageUrl = null;
    
    try {
        const res = await puter.ai.txt2img(this.imagePrompt);
        if (res instanceof HTMLImageElement || res?.src) {
            this.generatedImageUrl = res.src;
        } else if (res instanceof Blob) {
            this.generatedImageUrl = URL.createObjectURL(res);
        } else if (typeof res === 'string') {
            this.generatedImageUrl = res;
        }
    } catch (e: any) {
        alert('Хатогӣ ҳангоми сохтани расм: ' + e.message);
    } finally {
        this.isGeneratingImage = false;
    }
  }

  // --- Speech ---
  async generateSpeech() {
      if (!this.speechText.trim() || typeof puter === 'undefined') return;
      
      this.isGeneratingSpeech = true;
      this.audioUrl = null;

      try {
          const res = await puter.ai.txt2speech(this.speechText);
          if (res && typeof res.play === 'function') {
              this.audioUrl = res.src;
          } else if (res instanceof Blob) {
              this.audioUrl = URL.createObjectURL(res);
          } else if (typeof res === 'string') {
              this.audioUrl = res;
          } else if (res?.src) {
              this.audioUrl = res.src;
          }
      } catch (e: any) {
          alert('Хатогӣ ҳангоми табдил ба овоз: ' + e.message);
      } finally {
          this.isGeneratingSpeech = false;
      }
  }

}
