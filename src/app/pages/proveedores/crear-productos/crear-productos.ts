import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExcelService } from '../../../services/excel';

function numberGte(min: number) {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const n = parseFloat(String(ctrl.value).replace(',', '.'));
    if (Number.isNaN(n)) return { number: true };
    return n >= min ? null : { min: { min } };
  };
}

type ItemProveedor = {
  nombre_base: string;
  variante?: string;
  unidad_compra: string;
  cant_por_unidad_compra: number;
  precio_compra: number; // por unidad de compra
  unidad_venta: string;
  permite_fraccion: boolean;
  permite_entero: boolean;
};

@Component({
  selector: 'app-crear-productos-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './crear-productos.html',
  styleUrl: './crear-productos.scss'
})
export class CrearProductosComponent implements OnInit {
  form!: FormGroup;

  // lista temporal de items agregados en este paso
  items: ItemProveedor[] = [];

  // estado para "duplicado"
  dupOpen = false;
  dupIndex = -1; // índice del duplicado en items (si existe)
  pendingItem: ItemProveedor | null = null; // item que gatilló el duplicado

  // edición inline
  editIndex = -1;

  // preview derivados
  precioPorUnidadVenta = 0;
  precioEntero = 0;

   saving = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private excel: ExcelService, // << inyectamos
  ) {}

  ngOnInit(): void {
    // si no hay paso1, volvemos al primer paso
    const step1 = sessionStorage.getItem('crearProveedor.step1');
    if (!step1) {
      this.router.navigateByUrl('/proveedores/crear');
      return;
    }

    // levantar items previos si los hubiera
    const saved = sessionStorage.getItem('crearProveedor.step2.items');
    if (saved) {
      try { this.items = JSON.parse(saved); } catch { this.items = []; }
    }

    // form base
    this.form = this.fb.group({
      nombre_base: ['', [Validators.required]],
      variante: [''],
      unidad_compra: ['', [Validators.required]],
      cant_por_unidad_compra: [1, [numberGte(0.000001)]],
      precio_compra: [0, [numberGte(0)]],        // por unidad de compra
      unidad_venta: ['', [Validators.required]],
      permite_fraccion: [false],
      permite_entero: [true],
    });

    // recalcular previsualización al cambiar valores
    this.form.valueChanges.subscribe(() => this.calcPreview());
    this.calcPreview();
  }

  private n(v: any): number {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  }

  calcPreview() {
    const cant = this.n(this.form.value.cant_por_unidad_compra);
    const precioCompra = this.n(this.form.value.precio_compra);
    if (cant > 0) {
      this.precioPorUnidadVenta = precioCompra / cant;
      this.precioEntero = this.precioPorUnidadVenta * cant; // = precioCompra
    } else {
      this.precioPorUnidadVenta = 0;
      this.precioEntero = 0;
    }
  }

  // agregar o confirmar edición
  addOrUpdate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const item: ItemProveedor = {
      nombre_base: String(this.form.value.nombre_base).trim(),
      variante: String(this.form.value.variante || '').trim() || undefined,
      unidad_compra: String(this.form.value.unidad_compra).trim(),
      cant_por_unidad_compra: this.n(this.form.value.cant_por_unidad_compra),
      precio_compra: this.n(this.form.value.precio_compra),
      unidad_venta: String(this.form.value.unidad_venta).trim(),
      permite_fraccion: !!this.form.value.permite_fraccion,
      permite_entero: !!this.form.value.permite_entero,
    };

    // ¿modo edición?
    if (this.editIndex >= 0) {
      this.items[this.editIndex] = item;
      this.editIndex = -1;
      this.persist();
      this.form.reset({ unidad_compra:'', cant_por_unidad_compra:1, precio_compra:0, unidad_venta:'', permite_fraccion:false, permite_entero:true });
      this.calcPreview();
      return;
    }

    // detectar duplicado por nombre+variante
    const idx = this.items.findIndex(it =>
      it.nombre_base.toLowerCase().trim() === item.nombre_base.toLowerCase().trim() &&
      (it.variante || '').toLowerCase().trim() === (item.variante || '').toLowerCase().trim()
    );

    if (idx >= 0) {
      // abrir diálogo duplicado
      this.dupOpen = true;
      this.dupIndex = idx;
      this.pendingItem = item;
      return;
    }

    // no hay duplicado → agregar
    this.items.push(item);
    this.persist();
    this.form.reset({ unidad_compra:'', cant_por_unidad_compra:1, precio_compra:0, unidad_venta:'', permite_fraccion:false, permite_entero:true });
    this.calcPreview();
  }

  // acciones duplicado
  dupActualizarPrecio() {
    if (this.pendingItem && this.dupIndex >= 0) {
      // actualizar precio y conversiones en el existente
      const target = this.items[this.dupIndex];
      target.unidad_compra = this.pendingItem.unidad_compra;
      target.cant_por_unidad_compra = this.pendingItem.cant_por_unidad_compra;
      target.precio_compra = this.pendingItem.precio_compra;
      target.unidad_venta = this.pendingItem.unidad_venta;
      target.permite_fraccion = this.pendingItem.permite_fraccion;
      target.permite_entero = this.pendingItem.permite_entero;
      this.persist();
    }
    this.dupCerrar();
  }

  dupCancelar() {
    this.dupCerrar();
  }

  dupEsVarianteDistinta() {
    // pedir variante y crear item nuevo con variante; lo resolvemos usando el campo variante del form
    if (this.pendingItem) {
      // si la pending no tiene variante, le inventamos un placeholder para que el usuario lo edite luego
      if (!this.pendingItem.variante) {
        this.pendingItem.variante = 'Variante';
      }
      this.items.push(this.pendingItem);
      this.persist();
    }
    this.dupCerrar();
  }

  private dupCerrar() {
    this.dupOpen = false;
    this.dupIndex = -1;
    this.pendingItem = null;
    this.form.reset({ unidad_compra:'', cant_por_unidad_compra:1, precio_compra:0, unidad_venta:'', permite_fraccion:false, permite_entero:true });
    this.calcPreview();
  }

  // edición
  edit(i: number) {
    this.editIndex = i;
    const it = this.items[i];
    this.form.setValue({
      nombre_base: it.nombre_base,
      variante: it.variante || '',
      unidad_compra: it.unidad_compra,
      cant_por_unidad_compra: it.cant_por_unidad_compra,
      precio_compra: it.precio_compra,
      unidad_venta: it.unidad_venta,
      permite_fraccion: it.permite_fraccion,
      permite_entero: it.permite_entero,
    });
    this.calcPreview();
  }

  remove(i: number) {
    this.items.splice(i, 1);
    this.persist();
  }

  // guardar/volver/cancelar
  async guardarProveedor() {
    if (this.items.length === 0) {
      alert('Agregá al menos un producto antes de guardar.');
      return;
    }
    const paso1 = sessionStorage.getItem('crearProveedor.step1');
    if (!paso1) {
      alert('Faltan los datos del proveedor (Paso 1).');
      this.router.navigateByUrl('/proveedores/crear');
      return;
    }

    const proveedor = JSON.parse(paso1);
    try {
      this.saving = true;
      await this.excel.guardarProveedorYProductos(proveedor, this.items);
      // limpiar borradores
      sessionStorage.removeItem('crearProveedor.step1');
      sessionStorage.removeItem('crearProveedor.step2.items');
      alert('Proveedor guardado en Excel ✅');
      this.router.navigateByUrl('/proveedores');
    } catch (err:any) {
      console.error(err);
      alert('No se pudo guardar en el Excel. Probá de nuevo.');
    } finally {
      this.saving = false;
    }
  }

  volverPaso1() {
    // volvemos sin borrar lo cargado
    this.router.navigateByUrl('/proveedores/crear');
  }

  cancelar() {
    if (confirm('¿Cancelar? Se perderán los datos no guardados.')) {
      sessionStorage.removeItem('crearProveedor.step1');
      sessionStorage.removeItem('crearProveedor.step2.items');
      this.router.navigateByUrl('/');
    }
  }

  private persist() {
    sessionStorage.setItem('crearProveedor.step2.items', JSON.stringify(this.items));
  }

  // helpers de vista
  precioUnidadVenta(it: ItemProveedor): number {
    return it.cant_por_unidad_compra > 0 ? it.precio_compra / it.cant_por_unidad_compra : 0;
  }
}