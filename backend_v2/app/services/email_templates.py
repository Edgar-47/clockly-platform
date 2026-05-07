"""HTML email templates for ClockLy transactional emails.

Each function returns (subject, text_body, html_body) as a tuple.
The HTML uses inline CSS for maximum email client compatibility.
"""
from __future__ import annotations

import html
from datetime import datetime

from app.models.enums import UserRole

# ── Brand constants ───────────────────────────────────────────────────────────
_PRIMARY = "#2563EB"
_DARK = "#0F172A"
_MUTED = "#64748B"
_BORDER = "#E2E8F0"
_BG = "#F8FAFC"
_SUCCESS = "#16A34A"
_WHITE = "#FFFFFF"

_ROLE_LABELS: dict[str, str] = {
    "owner": "Propietario",
    "admin": "Administrador",
    "hr_manager": "Responsable RRHH",
    "manager": "Manager",
    "employee": "Empleado",
}


def _base_html(*, title: str, content: str) -> str:
    """Wrap content in the standard ClockLy email shell."""
    safe_title = html.escape(title)
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:{_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:{_PRIMARY};border-radius:12px 12px 0 0;padding:28px 36px;">
              <span style="font-size:22px;font-weight:700;color:{_WHITE};letter-spacing:-0.5px;">ClockLy</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:{_WHITE};padding:36px;border:1px solid {_BORDER};border-top:none;border-radius:0 0 12px 12px;">
              {content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 0;text-align:center;font-size:12px;color:{_MUTED};">
              ClockLy &mdash; Control horario para negocios
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:{_DARK};letter-spacing:-0.4px;">{html.escape(text)}</h1>'


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:{_MUTED};">{text}</p>'


def _cta(label: str, url: str) -> str:
    safe_label = html.escape(label)
    safe_url = html.escape(url, quote=True)
    return f"""
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:8px;background:{_PRIMARY};">
      <a href="{safe_url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:{_WHITE};text-decoration:none;border-radius:8px;">{safe_label}</a>
    </td>
  </tr>
</table>"""


def _divider() -> str:
    return f'<hr style="margin:24px 0;border:none;border-top:1px solid {_BORDER};">'


def _badge(text: str, color: str = _PRIMARY) -> str:
    return f'<span style="display:inline-block;background:{color}1A;color:{color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:100px;">{html.escape(text)}</span>'


def _info_row(label: str, value: str, *, value_is_html: bool = False) -> str:
    safe_label = html.escape(label)
    safe_value = value if value_is_html else html.escape(value)
    return f"""
<tr>
  <td style="padding:8px 0;font-size:13px;color:{_MUTED};width:140px;vertical-align:top;">{safe_label}</td>
  <td style="padding:8px 0;font-size:13px;color:{_DARK};font-weight:500;">{safe_value}</td>
</tr>"""


# ── Templates ─────────────────────────────────────────────────────────────────

def invitation_email(
    *,
    to_email: str,
    company_name: str,
    invited_by_name: str,
    role: UserRole,
    acceptance_url: str,
    expires_at: datetime,
) -> tuple[str, str, str]:
    role_label = _ROLE_LABELS.get(role.value, role.value)
    safe_company_name = html.escape(company_name)
    safe_invited_by_name = html.escape(invited_by_name)
    subject = f"Invitación para unirte a {company_name} en ClockLy"
    text_body = (
        f"{invited_by_name} te ha invitado a {company_name} como {role_label}.\n\n"
        f"Acepta la invitación aquí:\n{acceptance_url}\n\n"
        f"Este enlace caduca el {expires_at.strftime('%d/%m/%Y a las %H:%M')}."
    )
    content = (
        _h1("Te han invitado a ClockLy")
        + _p(f"<strong>{safe_invited_by_name}</strong> te invita a unirte a <strong>{safe_company_name}</strong>.")
        + f'<table cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid {_BORDER};border-radius:8px;width:100%;">'
        + _info_row("Empresa", company_name)
        + _info_row("Tu rol", f"{_badge(role_label)}", value_is_html=True)
        + _info_row("Invitado por", invited_by_name)
        + _info_row("Caduca", expires_at.strftime("%d/%m/%Y %H:%M"))
        + "</table>"
        + _cta("Aceptar invitación", acceptance_url)
        + _divider()
        + _p(f'Si no esperabas esta invitación, ignora este email. El enlace caduca automáticamente el {expires_at.strftime("%d/%m/%Y")}.')
    )
    return subject, text_body, _base_html(title=subject, content=content)


def password_reset_email(
    *,
    to_email: str,
    full_name: str,
    reset_url: str,
    expires_at: datetime,
) -> tuple[str, str, str]:
    subject = "Restablece tu contraseña de ClockLy"
    safe_full_name = html.escape(full_name)
    text_body = (
        f"Hola {full_name},\n\n"
        "Hemos recibido una solicitud para restablecer tu contraseña de ClockLy.\n"
        f"Puedes definir una nueva aquí:\n{reset_url}\n\n"
        f"Este enlace caduca el {expires_at.strftime('%d/%m/%Y a las %H:%M')}.\n"
        "Si no solicitaste este cambio, ignora este email."
    )
    content = (
        _h1("Restablecer contraseña")
        + _p(f"Hola <strong>{safe_full_name}</strong>,")
        + _p("Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ClockLy. Si no fuiste tú, ignora este email.")
        + _cta("Restablecer contraseña", reset_url)
        + _divider()
        + _p(f"Este enlace es válido hasta el <strong>{expires_at.strftime('%d/%m/%Y a las %H:%M')}</strong> y solo puede usarse una vez.")
    )
    return subject, text_body, _base_html(title=subject, content=content)


def company_welcome_email(
    *,
    to_email: str,
    full_name: str,
    company_name: str,
    login_url: str,
) -> tuple[str, str, str]:
    subject = f"¡Bienvenido a ClockLy! Tu empresa {company_name} ya está activa"
    safe_company_name = html.escape(company_name)
    text_body = (
        f"Hola {full_name},\n\n"
        f"Tu empresa {company_name} ya está creada en ClockLy.\n"
        f"Accede aquí para completar la configuración:\n{login_url}\n\n"
        "Te recomendamos completar el onboarding: añade empleados, configura el kiosk y define políticas de fichaje."
    )
    checklist = "".join(
        f'<li style="margin:6px 0;font-size:14px;color:{_MUTED};">{item}</li>'
        for item in [
            "Añade tus empleados (o importa desde CSV)",
            "Configura el kiosk con PIN",
            "Activa la geolocalización si la necesitas",
            "Invita a tus managers o administradores",
        ]
    )
    content = (
        _h1(f"¡Bienvenido, {full_name}!")
        + _p(f"Tu empresa <strong>{safe_company_name}</strong> ya está activa en ClockLy. Solo te quedan unos minutos para tenerlo todo listo.")
        + f'<ul style="margin:0 0 20px;padding:0 0 0 20px;">{checklist}</ul>'
        + _cta("Completar onboarding", login_url)
        + _divider()
        + _p("Si tienes alguna duda, responde a este email y te ayudamos.")
    )
    return subject, text_body, _base_html(title=subject, content=content)


def sensitive_change_email(
    *,
    to_email: str,
    full_name: str,
    change_name: str,
    occurred_at: datetime,
) -> tuple[str, str, str]:
    subject = "Aviso de seguridad de ClockLy"
    safe_full_name = html.escape(full_name)
    safe_change_name = html.escape(change_name)
    text_body = (
        f"Hola {full_name},\n\n"
        f"Se ha registrado un cambio sensible en tu cuenta: {change_name}.\n"
        f"Fecha: {occurred_at.strftime('%d/%m/%Y %H:%M')}.\n\n"
        "Si no reconoces esta acción, contacta con el administrador de tu empresa."
    )
    content = (
        _h1("Aviso de seguridad")
        + _p(f"Hola <strong>{safe_full_name}</strong>,")
        + _p(f"Se ha detectado una acción sensible en tu cuenta de ClockLy:")
        + f'<div style="background:{_BG};border:1px solid {_BORDER};border-radius:8px;padding:16px;margin:16px 0;">'
        + f'<p style="margin:0;font-size:15px;font-weight:600;color:{_DARK};">{safe_change_name}</p>'
        + f'<p style="margin:4px 0 0;font-size:13px;color:{_MUTED};">{occurred_at.strftime("%d/%m/%Y a las %H:%M")}</p>'
        + "</div>"
        + _p("Si reconoces esta acción, no hay nada más que hacer. Si <strong>no</strong> reconoces esta acción, contacta de inmediato con el administrador de tu empresa.")
    )
    return subject, text_body, _base_html(title=subject, content=content)


def weekly_summary_email(
    *,
    to_email: str,
    full_name: str,
    company_name: str,
    week_label: str,
    total_hours: float,
    session_count: int,
    dashboard_url: str,
) -> tuple[str, str, str]:
    subject = f"Resumen semanal de horas — {week_label}"
    safe_full_name = html.escape(full_name)
    safe_company_name = html.escape(company_name)
    safe_week_label = html.escape(week_label)
    hours_int = int(total_hours)
    minutes_int = int((total_hours - hours_int) * 60)
    hours_label = f"{hours_int}h {minutes_int:02d}m"
    text_body = (
        f"Hola {full_name},\n\n"
        f"Tu resumen de la semana {week_label} en {company_name}:\n"
        f"- Sesiones registradas: {session_count}\n"
        f"- Horas totales: {hours_label}\n\n"
        f"Ver panel: {dashboard_url}"
    )
    content = (
        _h1(f"Tu semana en ClockLy")
        + _p(f"Hola <strong>{safe_full_name}</strong>, aquí tienes el resumen de <strong>{safe_week_label}</strong> en {safe_company_name}:")
        + f'<table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">'
        + f'<tr>'
        + f'<td style="background:{_PRIMARY}0D;border:1px solid {_PRIMARY}33;border-radius:8px;padding:16px 20px;text-align:center;width:50%;">'
        + f'<p style="margin:0;font-size:28px;font-weight:700;color:{_PRIMARY};">{hours_label}</p>'
        + f'<p style="margin:4px 0 0;font-size:12px;color:{_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Horas trabajadas</p>'
        + f'</td>'
        + f'<td style="width:12px;"></td>'
        + f'<td style="background:{_BG};border:1px solid {_BORDER};border-radius:8px;padding:16px 20px;text-align:center;width:50%;">'
        + f'<p style="margin:0;font-size:28px;font-weight:700;color:{_DARK};">{session_count}</p>'
        + f'<p style="margin:4px 0 0;font-size:12px;color:{_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Fichajes</p>'
        + f'</td>'
        + f'</tr></table>'
        + _cta("Ver panel completo", dashboard_url)
    )
    return subject, text_body, _base_html(title=subject, content=content)


def missed_clockout_email(
    *,
    to_email: str,
    full_name: str,
    company_name: str,
    clock_in_at: datetime,
    dashboard_url: str,
) -> tuple[str, str, str]:
    subject = f"Fichaje sin salida registrada — {company_name}"
    safe_full_name = html.escape(full_name)
    safe_company_name = html.escape(company_name)
    text_body = (
        f"Hola {full_name},\n\n"
        f"Tienes un fichaje sin salida desde el {clock_in_at.strftime('%d/%m/%Y a las %H:%M')} en {company_name}.\n"
        "Si ya saliste, puedes editar el fichaje desde el panel o contacta con tu administrador.\n\n"
        f"Ver panel: {dashboard_url}"
    )
    content = (
        _h1("Fichaje sin salida")
        + _p(f"Hola <strong>{safe_full_name}</strong>,")
        + _p(f"Detectamos que tienes un fichaje de <strong>entrada</strong> sin salida registrada en <strong>{safe_company_name}</strong>.")
        + f'<div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;padding:16px 20px;margin:16px 0;">'
        + f'<p style="margin:0;font-size:14px;color:#713F12;">Entrada: <strong>{clock_in_at.strftime("%d/%m/%Y a las %H:%M")}</strong></p>'
        + f'<p style="margin:6px 0 0;font-size:13px;color:#92400E;">Salida: no registrada</p>'
        + "</div>"
        + _p("Si ya saliste del trabajo, puedes corregirlo desde el panel de control o avisar a tu administrador.")
        + _cta("Ver mis fichajes", dashboard_url)
    )
    return subject, text_body, _base_html(title=subject, content=content)
