import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';
import { AiService } from '../../../services/ai.service';

interface ChatMessage {
  id: string;
  sender: 'admin' | 'ai';
  text: string;
  timestamp: number;
  isTyping?: boolean;
}

@Component({
  selector: 'app-admin-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-[calc(100vh-6rem)] flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl relative">
      <!-- Header -->
      <div class="p-4 bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <i class="fi fi-rr-robot text-xl text-white"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white leading-tight">Мушовири ИИ (Admin Bot)</h2>
            <p class="text-xs text-slate-400">Пурсишҳо аз базаи маълумот</p>
          </div>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" #scrollContainer>
        
        <!-- Welcome Message -->
        <div class="flex justify-start">
          <div class="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-slate-800 border border-slate-700/50 shadow-md">
            <p class="text-slate-200 text-sm leading-relaxed">
              Салом! Ман ёвари ИИ ҳастам. Шумо метавонед дар бораи омор ва маълумоти барнома бо забони тоҷикӣ савол диҳед. (Масалан: "Имрӯз чанд корбар сабти ном шуд?" ё "Чанд паёми хонданашуда ҳаст?")
            </p>
            <span class="text-[10px] text-slate-500 mt-2 block">{{ currentTime | date:'shortTime' }}</span>
          </div>
        </div>

        <div *ngFor="let msg of messages" class="flex" [ngClass]="{'justify-end': msg.sender === 'admin', 'justify-start': msg.sender === 'ai'}" [@messageEnter]>
          <div class="max-w-[80%] rounded-2xl px-4 py-3 shadow-md relative group"
               [ngClass]="{
                 'bg-primary-600 text-white rounded-tr-sm': msg.sender === 'admin',
                 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-sm': msg.sender === 'ai'
               }">
            <div *ngIf="msg.isTyping" class="flex items-center gap-1 h-5 px-2">
              <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
            <div *ngIf="!msg.isTyping">
              <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>
              <span class="text-[10px] opacity-60 mt-1 block text-right">
                {{ msg.timestamp | date:'shortTime' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 bg-slate-800/50 border-t border-slate-700/50 backdrop-blur-xl">
        <form (ngSubmit)="sendMessage()" class="flex gap-2 relative">
          <input type="text" [(ngModel)]="newMessage" name="message"
                 placeholder="Саволи худро нависед..."
                 class="flex-1 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                 [disabled]="isLoading"
                 autocomplete="off">
          
          <button type="submit" [disabled]="!newMessage.trim() || isLoading"
                  class="w-12 h-12 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary-600/20 disabled:shadow-none transform active:scale-95">
            <i class="fi fi-rr-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  `,
  animations: [
    trigger('messageEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px) scale(0.95)' }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class AiChatComponent implements OnInit {
  private http = inject(HttpClient);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private aiService = inject(AiService);

  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  currentTime = Date.now();

  ngOnInit() {
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'admin',
      text: this.newMessage.trim(),
      timestamp: Date.now()
    };

    this.messages.push(userMessage);
    const question = this.newMessage.trim();
    this.newMessage = '';
    
    this.scrollToBottom();
    this.simulateTyping();

    const schemaPrompt = `You are an expert MySQL database administrator. Your task is to write ONLY a raw MySQL SELECT query to answer the user's question. 
Do not explain, do not use markdown formatting like \`\`\`sql. Just output the query.
Database Schema:
- users(id, unique_id, name, email, is_admin, is_vip, coins, xp, status, gender, location, bio, created_at, last_active)
- messages(id, sender_id, receiver_id, content, is_read, created_at)
- community_posts(id, user_id, text_content, created_at)
- friendships(id, user_id, friend_id, status, created_at)

CRITICAL RULES:
1. Pay close attention to column names!
2. The 'users' table has 'id', NOT 'user_id'.
3. The 'messages' table has 'sender_id' and 'receiver_id', NOT 'user_id'.
4. Do NOT make up column names that are not in the schema.
5. Provide ONLY the SQL query. NO markdown, NO explanations, NO intro, NO text. 
6. All 'created_at' and 'last_active' columns store UNIX TIMESTAMPS (integers in seconds). Do NOT compare them as strings. Use FROM_UNIXTIME(created_at) for date comparisons (e.g., DATE(FROM_UNIXTIME(created_at)) = CURDATE()).

User's Question: ${question}
Output ONLY the raw SQL query starting with SELECT:`;

    this.aiService.askAi(schemaPrompt).subscribe({
      next: (sqlResponse) => {
        let sqlQuery = sqlResponse.trim();
        
        // Extract SQL if wrapped in markdown
        const match = sqlQuery.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
        if (match) {
          sqlQuery = match[1].trim();
        } else {
          // Remove potential leading explanations
          const selectIndex = sqlQuery.toUpperCase().indexOf('SELECT');
          if (selectIndex !== -1) {
            sqlQuery = sqlQuery.substring(selectIndex).trim();
          }
        }

        if (sqlQuery && sqlQuery.toUpperCase().startsWith('SELECT')) {
          // Execute SQL via our backend
          this.http.post<any>(`${environment.phpBaseUrl}/api/admin/ai-query`, { query: sqlQuery }).subscribe({
            next: (dbRes) => {
              if (dbRes.error) {
                this.showAiError("Хатогӣ дар базаи маълумот: " + dbRes.error + "\n\nКоди SQL:\n" + sqlQuery);
                return;
              }

              const jsonResult = dbRes.data;
              const answerPrompt = `You are an AI assistant in an Admin Panel. The admin asked: '${question}'. 
You ran a database query and got this result: ${jsonResult}.
Answer the admin's question based on this data. Your answer MUST be in Tajik language (Тоҷикӣ). Be helpful and concise.`;

              // Generate final answer
              this.aiService.askAi(answerPrompt).subscribe({
                next: (finalAnswer) => {
                  this.removeTypingIndicator();
                  this.messages.push({
                    id: Date.now().toString(),
                    sender: 'ai',
                    text: finalAnswer,
                    timestamp: Date.now()
                  });
                  this.scrollToBottom();
                },
                error: (err) => this.showAiError("Хатогӣ ҳангоми тавлиди ҷавоб аз ИИ.")
              });
            },
            error: (err) => this.showAiError("Мутаассифона, ҳангоми пайвастшавӣ ба сервер хатогӣ рух дод.")
          });
        } else {
          console.error("AI SQL Error. Raw Response:", sqlResponse);
          this.showAiError("Бубахшед, ман натавонистам ин саволро ба SQL гардонам.\nҶавоби ИИ чунин буд:\n" + sqlResponse);
        }
      },
      error: (err) => this.showAiError("Хатогӣ ҳангоми пайвастшавӣ ба хидмати ИИ (Groq).")
    });
  }

  private showAiError(text: string) {
    this.removeTypingIndicator();
    this.messages.push({
      id: Date.now().toString(),
      sender: 'ai',
      text: text,
      timestamp: Date.now()
    });
    this.scrollToBottom();
  }

  private simulateTyping() {
    this.isLoading = true;
    this.messages.push({
      id: 'typing',
      sender: 'ai',
      text: '',
      timestamp: Date.now(),
      isTyping: true
    });
    this.scrollToBottom();
  }

  private removeTypingIndicator() {
    this.isLoading = false;
    this.messages = this.messages.filter(m => m.id !== 'typing');
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }
}
