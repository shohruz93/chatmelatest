import { Component, Input, OnInit, ElementRef, Renderer2, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adsterra-banner',
  standalone: true,
  imports: [CommonModule],
  template: `<div #adContainer class="ad-container" [style.min-height.px]="height"></div>`,
  styles: [`
    .ad-container { 
      display: flex; 
      justify-content: center; 
      align-items: center;
      margin: 15px auto; 
      width: 100%;
      overflow: hidden;
      background: transparent;
    }
  `]
})
export class AdsterraBannerComponent implements AfterViewInit {
  @Input() key!: string;
  @Input() width!: number;
  @Input() height!: number;
  @ViewChild('adContainer', { static: false }) adContainer!: ElementRef;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    if (!this.key || !this.width || !this.height) return;

    // Create an iframe to safely isolate the document.write call from invoke.js
    const iframe = this.renderer.createElement('iframe');
    this.renderer.setAttribute(iframe, 'width', this.width.toString());
    this.renderer.setAttribute(iframe, 'height', this.height.toString());
    this.renderer.setAttribute(iframe, 'frameborder', '0');
    this.renderer.setAttribute(iframe, 'scrolling', 'no');
    this.renderer.setStyle(iframe, 'border', 'none');
    this.renderer.setStyle(iframe, 'overflow', 'hidden');
    
    // Create HTML content for the iframe
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }
          </style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : '${this.key}',
              'format' : 'iframe',
              'height' : ${this.height},
              'width' : ${this.width},
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="https://www.highperformanceformat.com/${this.key}/invoke.js"></script>
        </body>
      </html>
    `;
    
    this.renderer.appendChild(this.adContainer.nativeElement, iframe);
    
    // Write content to iframe safely
    setTimeout(() => {
      try {
        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
        }
      } catch (e) {
        console.error('Failed to load Adsterra banner:', e);
      }
    }, 100);
  }
}
