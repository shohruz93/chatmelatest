import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './confirm-dialog.component.html',
    styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
    @Input() isOpen = false;
    @Input() title = 'DIALOG.TITLE_DEFAULT';
    @Input() message = 'DIALOG.MESSAGE_DEFAULT';
    @Input() confirmText = 'COMMON.CONFIRM';
    @Input() cancelText = 'COMMON.CANCEL';
    @Input() confirmButtonClass = 'btn-confirm';
    @Input() icon = '❓';

    @Output() confirmed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    onConfirm() {
        this.confirmed.emit();
    }

    onCancel() {
        this.cancelled.emit();
    }

    onBackdropClick() {
        this.cancelled.emit();
    }
}
