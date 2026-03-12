import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Articulo as ArticuloService } from '../../services/articulo';
import { API_CONFIG } from '../../api.config';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { Ticket as TicketService } from '../../services/ticket';
import { Ticket as TicketModel } from '../../models/ticket';

@Component({
  selector: 'app-carrito',
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito implements OnInit, OnDestroy {
  API_CONFIG = API_CONFIG;
  carrito = signal<any[]>([]);
  totalCantidad = signal<number>(0);
  totalPrecio = signal<number>(0);
  ticket = signal<TicketModel | null>(null);
  mostrarModal = signal<boolean>(false);
  linkPago = signal<string | null>(null);
  loading = signal<boolean>(false);

  constructor(private articuloService: ArticuloService,
              private ticketService: TicketService
  ) {};

  ngOnInit(): void {
    this.cargarCarrito();
    window.addEventListener('carritoActualizado', this.carritoHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('carritoActualizado', this.carritoHandler);
  }

  cargarCarrito() {
    const carritoSession = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    if (!carritoSession.length) {
      this.carrito.set([]);
      this.actualizarTotales();
      return;
    };
    const requests: Observable<any>[] = carritoSession.map((item: any) =>
      this.articuloService.getArticuloPublic(item.id)
    );
    forkJoin(requests).subscribe(results => {
      const articulosConCantidad = results.map((res, index) => {
        const articulo = res.data || res;
        return {
          ...articulo,
          id: itemId(articulo),
          cantidad: carritoSession[index].cantidad
        };
      });
      this.carrito.set(articulosConCantidad);
      this.actualizarTotales();
    });
    function itemId(articulo: any) {
      return articulo.id || articulo._id;
    };
  };

  private guardarCarrito(): void {
    const data = this.carrito().map(item => ({ id: item.id, cantidad: item.cantidad }));
    sessionStorage.setItem('carrito', JSON.stringify(data));
    window.dispatchEvent(new Event('carritoActualizado'));
    this.actualizarTotales();
  };

  sumar(id: string) {
    const carrito = [...this.carrito()];
    const item = carrito.find(item => item.id === id);
    if (!item) {
      return;
    };
    item.cantidad++;
    this.carrito.set(carrito);
    this.guardarCarrito();
  };

  restar(id: string) {
    let carrito = [...this.carrito()];
    const item = carrito.find(item => item.id === id);
    if (!item) {
      return;
    };
    item.cantidad--;
    if (item.cantidad <= 0) {
      carrito = carrito.filter(item => item.id !== id);
    };
    this.carrito.set(carrito);
    this.guardarCarrito();
  };

  eliminar(id: string) {
    this.carrito.update(carrito => carrito.filter(item => item.id !== id));
    this.guardarCarrito();
  };

  vaciarCarrito() {
    this.carrito.set([]);
    this.guardarCarrito();
  };

  actualizarTotales() {
    const carrito = this.carrito();
    const totalCantidad = carrito.reduce((total, articulo) => total + articulo.cantidad, 0);
    const totalPrecio = carrito.reduce((total, articulo) => total + articulo.cantidad * articulo.precio, 0);
    this.totalCantidad.set(totalCantidad);
    this.totalPrecio.set(totalPrecio);
  };

  carritoHandler = () => {
    this.cargarCarrito();
  };

  confirmarCompra() {
    const carrito = this.carrito().map(item => ({ id: item.id, cantidad: item.cantidad }));
    if(!carrito.length) {
      alert("El carrito esta vacio");
      return;
    };
    this.loading.set(true);
    this.ticketService.createTicket(carrito).subscribe(
      (result:any) => {
        this.loading.set(false)
        this.ticket.set(Object.assign(new TicketModel(), result.data));
        this.mostrarModal.set(true);
        this.carrito.set([]);
        sessionStorage.removeItem('carrito');
        window.dispatchEvent(new Event('carritoActualizado'));
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor")
      }
    );
  };

  pagarTicket() {
    const ticket = this.ticket();
    if(!ticket) {
      return;
    };
    this.loading.set(true);
    this.ticketService.pagarTicket(ticket._id).subscribe(
      (result:any) => {
        this.loading.set(false);
        this.linkPago.set(result.data);
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };
}
