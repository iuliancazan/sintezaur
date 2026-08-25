import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastsComponent } from './ui/toasts.component';

@Component({
  imports: [RouterModule, ToastsComponent],
  selector: 'ws-root',
  template: '<router-outlet /><ws-toasts />',
})
export class App {}
