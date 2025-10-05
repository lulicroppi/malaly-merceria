// src/app/root/root.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './root.html',
  styleUrl: './root.css'
})
export class RootComponent {
  // Root simple: Home se encarga de inicializar Excel
}