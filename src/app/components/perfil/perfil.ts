import { Component, OnInit, signal } from '@angular/core';
import { Usuario as UsuarioService } from '../../services/usuario';
import { Ticket as TicketService} from '../../services/ticket';
import { Usuario as UsuarioModel} from '../../models/usuario';
import { Ticket as TicketModel } from '../../models/ticket';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-perfil',
  imports: [ CommonModule, FormsModule ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  pestanaActiva = signal<'perfil' | 'tickets'>('perfil');
  loading = signal<boolean>(false);
  usuario = signal<UsuarioModel>(new UsuarioModel());
  editNombre = signal<boolean>(false);
  editEmail = signal<boolean>(false);
  editUsername = signal<boolean>(false);
  nombre_completo = signal<string>('');
  email = signal<string>('');
  username = signal<string>('');
  actualPassword = signal<string>('');
  newPassword = signal<string>('');
  repeatNewPassword = signal<string>('');
  tickets = signal<TicketModel[]>([]);
  ticket = signal<TicketModel | null>(null);
  linkPago = signal<string | null>(null);
  mostrarModal = signal<boolean>(false);
  mostrarPassword = signal<boolean>(false);

  constructor(private usuarioService: UsuarioService,
              private ticketService: TicketService,
              private route: ActivatedRoute
  ) {};

  ngOnInit(): void {
    this.cargarPerfil();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if(tab === 'tickets') {
      this.cambiarPestana('tickets');
    };
  }

  cargarPerfil() {
    this.loading.set(true);
    this.usuarioService.getMyProfile().subscribe(
      (result:any) => {
        this.usuario.set(result.data);
        this.nombre_completo.set(result.data.nombre_completo);
        this.email.set(result.data.email);
        this.username.set(result.data.username);
        this.loading.set(false);
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };

  guardarNombre() {
    this.actualizarPerfil({ nombre_completo: this.nombre_completo() }, () => {
      this.editNombre.set(false);
    });
  };

  guardarEmail() {
    this.actualizarPerfil({ email: this.email() }, () => {
      this.editEmail.set(false);
    });
  };

  guardarUsername() {
    this.actualizarPerfil({ username: this.username() }, () => {
      this.editUsername.set(false);
    });
  };

  private actualizarPerfil(body:any, cb?:() => void): void {
    this.loading.set(true);
    this.usuarioService.updateMyProfile(body).subscribe(
      (result:any) => {
        alert(result.msg);
        this.cargarPerfil();
        cb?.();
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };

  cancelarNombre() {
    this.nombre_completo.set(this.usuario().nombre_completo);
    this.editNombre.set(false);
  };

  cancelarEmail() {
    this.email.set(this.usuario().email);
    this.editEmail.set(false);
  };

  cancelarUsername() {
    this.username.set(this.usuario().username);
    this.editUsername.set(false);
  };

  cambiarPassword() {
    this.loading.set(true);
    this.usuarioService.changeMyPassword(this.actualPassword(), this.newPassword(), this.repeatNewPassword()).subscribe(
      (result:any) => {
        alert(result.msg);
        this.actualPassword.set('');
        this.newPassword.set('');
        this.repeatNewPassword.set('');
        this.loading.set(false);
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };

  cargarTickets() {
    this.loading.set(true);
    this.ticketService.getMyTickets().subscribe(
      (result:any) => {
        this.tickets.set(result.data.map((element:any) => {
          return Object.assign(new TicketModel(), element);
        }));
        this.loading.set(false);
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };

  verTicket(ticket: TicketModel) {
    this.ticket.set(ticket);
    this.linkPago.set(null);
    this.mostrarModal.set(true);
  };

  cerrarTicket() {
    this.mostrarModal.set(false);
    this.ticket.set(null);
    this.linkPago.set(null);
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

  cancelarTicket() {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    };
    if(!confirm('¿Seguro que deseas cancelar este ticket?')){
      return;
    };
    this.loading.set(true);
    this.ticketService.cancelarTicket(ticket._id).subscribe(
      (result:any) => {
        this.loading.set(false);
        alert(result.msg);
        this.cerrarTicket();
        this.cargarTickets();
      },
      (error:any) => {
        this.loading.set(false);
        alert(error.error.msg || "Error del servidor");
      }
    );
  };

  cambiarPestana(pestaña: 'perfil' | 'tickets'): void {
    this.pestanaActiva.set(pestaña);
    if(pestaña === 'tickets' && this.tickets().length === 0) {
      this.cargarTickets();
    };
  };
}
