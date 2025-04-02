import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { jwtDecode } from 'jwt-decode';

export function jwtInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  console.log("Dentro del interceptador");

  const token = localStorage.getItem('access_token');
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              localStorage.setItem('access_token', response.token);
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.token}`
                }
              });
              return next(req);
            }),
            catchError(() => {
              authService.logout();
              router.navigate(['/login']);
              toastr.error(
                'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
                'Sesión Expirada',
                { timeOut: 3000, closeButton: true }
              );
              return throwError(() => new Error('Refresh token failed'));
            })
          );
        } else {
          authService.logout();
          router.navigate(['/login']);
          toastr.error(
            'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
            'Sesión Expirada',
            { timeOut: 3000, closeButton: true }
          );
        }
      }
      // No registrar el error inicial en la consola
      return throwError(() => error);
    })
  );
}
