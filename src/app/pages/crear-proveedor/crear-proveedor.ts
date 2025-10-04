import { Component, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

function telValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = (ctrl.value || '').toString();
  if (!v) return { required: true };
  const ok = /^[0-9 +()\-\s]{6,}$/.test(v);
  return ok ? null : { tel: true };
}

// CUIT básico: 11 dígitos (validación liviana)
function cuitBasico(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = (ctrl.value || '').toString().replace(/\D/g, '');
  if (!v) return null; // opcional
  return /^\d{11}$/.test(v) ? null : { cuit: true };
}

@Component({
  selector: 'app-crear-proveedor',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './crear-proveedor.html',
  styleUrl: './crear-proveedor.scss'
})
export class CrearProveedorComponent implements OnInit {
  form!: FormGroup;  // se inicializa en ngOnInit

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      telefono: ['', [telValidator]],
      cuit: ['', [cuitBasico]],
      email: ['', [Validators.email]],
      direccion: [''],
      notas: [''],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const paso1 = {
      nombre: this.form.value.nombre!.toString().trim(),
      telefono: this.form.value.telefono!.toString().trim(),
      cuit: (this.form.value.cuit || '').toString().trim(),
      email: (this.form.value.email || '').toString().trim(),
      direccion: (this.form.value.direccion || '').toString().trim(),
      notas: (this.form.value.notas || '').toString().trim(),
    };
    sessionStorage.setItem('crearProveedor.step1', JSON.stringify(paso1));

    this.router.navigateByUrl('/proveedores/crear/productos');
  }

  cancelar() {
    sessionStorage.removeItem('crearProveedor.step1');
    this.router.navigateByUrl('/');
  }
}