import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'vx-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  constructor(public auth: AuthService) {}
}
