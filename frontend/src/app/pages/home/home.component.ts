import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Capacitor } from '@capacitor/core';

@Component({
    selector: 'app-home',
    imports: [RouterModule, CommonModule, HeaderComponent, TranslatePipe],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    isWeb = true;
    downloadUrls: { android: string | null; ios: string | null } = { android: null, ios: null };

    async ngOnInit() {
        try {
            // show only on web (not inside Capacitor native apps)
            this.isWeb = !Capacitor.isNativePlatform();
        } catch (e) {
            this.isWeb = true;
        }

        if (this.isWeb) {
            this.downloadUrls.android = await this.buildHashedUrl('android', 'apk');
            this.downloadUrls.ios = await this.buildHashedUrl('ios', 'ipa');
        }
    }

    private async buildHashedUrl(platform: string, ext: string) {
        const filename = `${platform}.${ext}`;
        const hash = await this.sha256Hex(filename);
        return `https://chatme.tj/downloads/${hash}.${ext}`;
    }

    private async sha256Hex(message: string) {
        const enc = new TextEncoder();
        const msgUint8 = enc.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
