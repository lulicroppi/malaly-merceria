import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './root.html',
  styleUrl: './root.scss'
})
export class RootComponent {
  // 👋 Root ya no inicializa nada. Home se encarga del Excel.
}