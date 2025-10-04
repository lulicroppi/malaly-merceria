import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearProductos } from './crear-productos';

describe('CrearProductos', () => {
  let component: CrearProductos;
  let fixture: ComponentFixture<CrearProductos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearProductos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearProductos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
