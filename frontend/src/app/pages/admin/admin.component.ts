import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, GetUsersResponse } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  public usersResponse$!: Observable<GetUsersResponse>;
  public isAdmin = false;

  constructor(private adminService: AdminService, private authService: AuthService) { }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user && user.is_admin) {
      this.isAdmin = true;
      this.usersResponse$ = this.adminService.getUsers();
    }
  }

  banUser(userId: number): void {
    this.adminService.banUser(userId).subscribe(() => {
      // Refresh the user list
      this.usersResponse$ = this.adminService.getUsers();
    });
  }
}
