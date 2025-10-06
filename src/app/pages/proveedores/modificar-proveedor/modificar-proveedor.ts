import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExcelService } from '../../../services/excel';

function telValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = (ctrl.value || '').toString();
  if (!v) return { required: true };
  const ok = /^[0-9 +()\-\s]{6,}$/.test(v);
  return ok ? null : { tel: true };
}
function cuitBasico(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = (ctrl.value || '').toString().replace(/\D/g, '');
  if (!v) return null;
  return /^\d{11}$/.test(v) ? null : { cuit: true };
}

@Component({
  selector: 'app-modificar-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './modificar-proveedor.html',
  styleUrl: './modificar-proveedor.scss'
})
export class ModificarProveedorComponent implements OnInit {
  proveedores: Array<{id_proveedor:string; nombre:string}> = [];
  selectedId = '';
  loading = true;
  saving = false;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private excel: ExcelService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      telefono: ['', [telValidator]],
      cuit: ['', [cuitBasico]],
      email: ['', [Validators.email]],
      direccion: [''],
      notas: [''],
    });

    await this.cargarLista();
  }

  async cargarLista() {
    try {
      const list = await this.excel.listProveedores();
      this.proveedores = list.map(p => ({ id_proveedor: p.id_proveedor, nombre: p.nombre }));
    } catch (e) {
      alert('No se pudo leer la lista de proveedores.');
    } finally {
      this.loading = false;
    }
  }

  async onSelect(id: any) {
    this.selectedId = id.target.value;
    if (!this.selectedId) return;
    try {
      const p = await this.excel.getProveedor(this.selectedId);
      if (!p) { alert('Proveedor no encontrado.'); return; }
      this.form.setValue({
        nombre: p.nombre || '',
        telefono: p.telefono || '',
        cuit: p.cuit || '',
        email: p.email || '',
        direccion: p.direccion || '',
        notas: p.notas || '',
      });
      this.form.markAsPristine();
    } catch {
      alert('No se pudo cargar el proveedor.');
    }
  }

  async guardar() {
    if (!this.selectedId) { alert('Seleccioná un proveedor.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    try {
      this.saving = true;
      await this.excel.updateProveedorBasic({
        id_proveedor: this.selectedId,
        nombre: String(v.nombre).trim(),
        telefono: String(v.telefono).trim(),
        cuit: String(v.cuit || '').trim(),
        email: String(v.email || '').trim(),
        direccion: String(v.direccion || '').trim(),
        notas: String(v.notas || '').trim(),
      });
      this.form.markAsPristine();
    } catch (e:any) {
      alert(e?.message || 'No se pudo actualizar el proveedor.');
    } finally {
      this.saving = false;
      this.router.navigateByUrl('');
    }
  }
}