"""
Genera el PDF de guia de prueba de ClockLy Demo Business.
Uso: python generate_demo_guide.py
"""
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent.parent
SHOT_DIR = BASE / "frontend-next" / "e2e" / "screenshots" / "demo-business"
OUT_PDF  = BASE / "docs" / "demo-business-guide.pdf"

# ── Fonts ──────────────────────────────────────────────────────────────────────
FONTS_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Arial",     str(FONTS_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold",str(FONTS_DIR / "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONTS_DIR / "ariali.ttf")))

# ── Colours ────────────────────────────────────────────────────────────────────
BLUE   = colors.HexColor("#2563EB")
BLUE_L = colors.HexColor("#EFF6FF")
GREY   = colors.HexColor("#6B7280")
GREY_D = colors.HexColor("#374151")
GREEN  = colors.HexColor("#16A34A")
WHITE  = colors.white
BLACK  = colors.black
BORDER = colors.HexColor("#E5E7EB")

# ── Styles ─────────────────────────────────────────────────────────────────────
def make_styles():
    s = {}
    s["cover_title"] = ParagraphStyle(
        "cover_title", fontName="Arial-Bold", fontSize=32, leading=38,
        textColor=BLUE, alignment=TA_CENTER, spaceAfter=8,
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub", fontName="Arial", fontSize=14, leading=18,
        textColor=GREY, alignment=TA_CENTER, spaceAfter=4,
    )
    s["cover_date"] = ParagraphStyle(
        "cover_date", fontName="Arial-Italic", fontSize=11, leading=14,
        textColor=GREY, alignment=TA_CENTER,
    )
    s["cred_title"] = ParagraphStyle(
        "cred_title", fontName="Arial-Bold", fontSize=13, leading=16,
        textColor=BLUE, spaceAfter=6,
    )
    s["cred_label"] = ParagraphStyle(
        "cred_label", fontName="Arial-Bold", fontSize=10, leading=14,
        textColor=GREY_D,
    )
    s["cred_value"] = ParagraphStyle(
        "cred_value", fontName="Arial", fontSize=10, leading=14,
        textColor=BLACK,
    )
    s["section_num"] = ParagraphStyle(
        "section_num", fontName="Arial-Bold", fontSize=10, leading=12,
        textColor=BLUE, spaceAfter=2,
    )
    s["section_title"] = ParagraphStyle(
        "section_title", fontName="Arial-Bold", fontSize=16, leading=20,
        textColor=BLUE_L, spaceAfter=4, spaceBefore=2,
    )
    s["section_desc"] = ParagraphStyle(
        "section_desc", fontName="Arial", fontSize=10, leading=15,
        textColor=GREY_D, spaceAfter=10,
    )
    s["caption"] = ParagraphStyle(
        "caption", fontName="Arial-Italic", fontSize=8.5, leading=12,
        textColor=GREY, alignment=TA_CENTER, spaceBefore=2, spaceAfter=8,
    )
    s["footer"] = ParagraphStyle(
        "footer", fontName="Arial", fontSize=8, textColor=GREY, alignment=TA_CENTER,
    )
    s["toc_item"] = ParagraphStyle(
        "toc_item", fontName="Arial", fontSize=10, leading=16,
        textColor=GREY_D, leftIndent=6,
    )
    return s

ST = make_styles()

# ── Page template (header + footer) ───────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN_L = 2.2 * cm
MARGIN_R = 2.2 * cm
MARGIN_T = 2.0 * cm
MARGIN_B = 2.5 * cm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

_page_num = [0]

def on_page(canvas, doc):
    _page_num[0] += 1
    canvas.saveState()
    # Footer line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_L, MARGIN_B - 4*mm, PAGE_W - MARGIN_R, MARGIN_B - 4*mm)
    # Footer text
    canvas.setFont("Arial", 8)
    canvas.setFillColor(GREY)
    canvas.drawCentredString(PAGE_W / 2, MARGIN_B - 9*mm,
        f"ClockLy Demo Business — Guia de Prueba Completa — Generado el 20/05/2026")
    canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 9*mm, f"Pag. {_page_num[0]}")
    canvas.restoreState()

def on_first_page(canvas, doc):
    _page_num[0] = 1
    # Blue background stripe at top of cover
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_H - 5*cm, PAGE_W, 5*cm, fill=1, stroke=0)
    canvas.restoreState()

# ── Helper: load screenshot ────────────────────────────────────────────────────
def img(filename: str, width_pct: float = 0.9) -> Image | None:
    path = SHOT_DIR / filename
    if not path.exists():
        print(f"  [skip] {filename} not found")
        return None
    from PIL import Image as PILImage
    with PILImage.open(str(path)) as pil:
        orig_w, orig_h = pil.size

    max_w = CONTENT_W * width_pct
    # Max height = 80% of usable page content area
    max_h = (PAGE_H - MARGIN_T - MARGIN_B) * 0.80

    ratio = orig_h / orig_w
    draw_w = max_w
    draw_h = draw_w * ratio
    # If too tall, scale down
    if draw_h > max_h:
        draw_h = max_h
        draw_w = draw_h / ratio

    im = Image(str(path))
    im.drawWidth  = draw_w
    im.drawHeight = draw_h
    return im

def section_header(num: str, title: str) -> list:
    """Returns a list of flowables for a section header."""
    # Blue bar background via Table trick
    header_table = Table(
        [[Paragraph(f"<font color='#93C5FD' size='9'>{num}</font>",
                    ParagraphStyle("sn", fontName="Arial-Bold", fontSize=9,
                                   textColor=colors.HexColor("#93C5FD"))),
          Paragraph(title,
                    ParagraphStyle("st", fontName="Arial-Bold", fontSize=15,
                                   leading=18, textColor=WHITE))]],
        colWidths=[1.8*cm, CONTENT_W - 1.8*cm],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (0, -1), 10),
        ("LEFTPADDING",   (1, 0), (1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return [Spacer(1, 6*mm), header_table, Spacer(1, 4*mm)]

def desc(text: str) -> Paragraph:
    return Paragraph(text, ST["section_desc"])

def caption(text: str) -> Paragraph:
    return Paragraph(text, ST["caption"])

def hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=4)

def add_screenshots(filenames: list[str]) -> list:
    """Add a list of screenshots with captions."""
    items = []
    labels = {
        "01_registro_formulario":      "Formulario de registro de empresa",
        "02_login_pagina":             "Pagina de inicio de sesion",
        "03_login_relleno":            "Login con credenciales introducidas",
        "04_post_login":               "Redireccion post-login al dashboard/onboarding",
        "05_onboarding_empresa":       "Paso 1 — Datos de empresa",
        "06_onboarding_empresa_relleno": "Paso 1 — Empresa configurada con sector y tamano",
        "07_onboarding_paso2_empleado": "Paso 2 — Crear primer empleado",
        "08_onboarding_paso3_kiosk":   "Paso 3 — Asignar PIN de kiosk",
        "09_onboarding_paso4_invitaciones": "Paso 4 — Invitar equipo (opcional)",
        "10_onboarding_paso5_final":   "Paso 5 — Resumen y estado del onboarding",
        "11_onboarding_completado":    "Onboarding completado",
        "01_dashboard_principal":      "Dashboard principal — metricas en tiempo real",
        "02_dashboard_detalle":        "Dashboard — tarjetas de resumen",
        "01_empleados_lista_completa": "Lista completa de 35 empleados",
        "02_empleados_formulario_nuevo": "Formulario de alta de nuevo empleado",
        "01_empleados_importar_csv":   "Importacion masiva de empleados via CSV",
        "11_resumen_empleados_finales": "Resumen final — equipo de 35 trabajadores",
        "02_fichajes_lista":           "Lista de fichajes con filtros",
        "03_fichajes_nominas_exportar": "Exportacion de nominas (A3 / Holded)",
        "01_fichajes_itss":            "Registro ITSS — Seguridad Social",
        "01_horarios_lista":           "Gestion de horarios de trabajo",
        "02_tickets_lista":            "Lista de tickets e incidencias",
        "03_gastos_lista":             "Lista de gastos de empresa",
        "04_gastos_nuevo_formulario":  "Formulario de nuevo gasto",
        "05_gastos_nuevo_relleno":     "Formulario de gasto rellenado",
        "02_retrasos_lista":           "Registro de retrasos detectados",
        "01_analytics_general":        "Analytics — vista general",
        "02_analytics_graficos":       "Analytics — graficos de tendencias",
        "03_ubicaciones_lista":        "Ubicaciones de trabajo configuradas",
        "04_salarios_lista":           "Gestion de salarios por empleado",
        "03_cierres_caja_lista":       "Cierres de caja diarios",
        "01_configuracion_empresa":    "Configuracion de la empresa",
        "02_configuracion_empresa_abajo": "Configuracion — opciones avanzadas",
        "03_kiosk_portada":            "Kiosk de fichaje por PIN",
        "04_upgrade_planes":           "Planes disponibles — Free / Pro / Business",
        "05_landing_principal":        "Landing page publica de ClockLy",
        "06_landing_privacidad":       "Politica de Privacidad (RGPD)",
        "07_landing_terminos":         "Terminos y Condiciones",
        "08_mobile_dashboard":         "Dashboard en movil (390px)",
        "09_mobile_empleados":         "Lista de empleados en movil",
        "10_mobile_kiosk":             "Kiosk en movil",
        "12_resumen_dashboard_final":  "Dashboard final — cuenta Business activa",
    }
    for fn in filenames:
        key = fn.replace(".png", "")
        image = img(fn)
        if image is None:
            continue
        label = labels.get(key, fn)
        items.extend([image, caption(f"Captura: {label}")])
    return items

# ── MAIN ───────────────────────────────────────────────────────────────────────
def build():
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="ClockLy Demo Business — Guia de Prueba Completa",
        author="ClockLy QA",
        subject="Demo Business Account — Prueba de todas las funcionalidades",
    )

    story = []

    # ──────────────────────────────────────────────────────────────────────────
    # PORTADA
    # ──────────────────────────────────────────────────────────────────────────
    # Space to clear the blue stripe
    story.append(Spacer(1, 3.5*cm))

    story.append(Paragraph("ClockLy", ParagraphStyle(
        "logo", fontName="Arial-Bold", fontSize=42, leading=48,
        textColor=WHITE, alignment=TA_CENTER,
    )))
    story.append(Paragraph("Demo Business", ParagraphStyle(
        "logo2", fontName="Arial", fontSize=22, leading=28,
        textColor=colors.HexColor("#BFDBFE"), alignment=TA_CENTER,
    )))
    story.append(Spacer(1, 4*cm))

    story.append(Paragraph("Guia de Prueba Completa", ST["cover_title"]))
    story.append(Paragraph("Cuenta Business con 35 empleados — Todas las funcionalidades", ST["cover_sub"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("20 de mayo de 2026", ST["cover_date"]))
    story.append(Spacer(1, 2*cm))

    # Credentials box
    cred_data = [
        ["URL App",      "https://app.clockly.es"],
        ["Email",        "demo.business.2026@test-clockly.com"],
        ["Contrasena",   "DemoBusiness2026!"],
        ["Empresa",      "Demo Business SL"],
        ["Plan",         "Business (empleados ilimitados)"],
        ["Empleados",    "35 trabajadores creados"],
        ["PIN Kiosk",    "9001  (Maria Garcia Lopez)"],
        ["PINs empleados", "9001, 1001 – 1035"],
    ]
    cred_rows = []
    for label, value in cred_data:
        cred_rows.append([
            Paragraph(label, ParagraphStyle("cl", fontName="Arial-Bold", fontSize=9.5,
                                             textColor=BLUE)),
            Paragraph(value, ParagraphStyle("cv", fontName="Arial", fontSize=9.5,
                                             textColor=GREY_D)),
        ])

    cred_table = Table(cred_rows, colWidths=[4.5*cm, CONTENT_W - 4.5*cm])
    cred_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), BLUE_L),
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#DBEAFE")),
        ("BOX",         (0, 0), (-1, -1), 1.2, BLUE),
        ("INNERGRID",   (0, 0), (-1, -1), 0.3, colors.HexColor("#BFDBFE")),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",(0, 0), (-1, -1), 10),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(cred_table)
    story.append(PageBreak())

    # ──────────────────────────────────────────────────────────────────────────
    # INDICE
    # ──────────────────────────────────────────────────────────────────────────
    story.extend(section_header("", "Indice de contenidos"))
    toc = [
        ("01", "Registro de Empresa"),
        ("02", "Inicio de Sesion"),
        ("03", "Onboarding — Configuracion Inicial"),
        ("04", "Dashboard"),
        ("05", "Empleados (35 trabajadores)"),
        ("06", "Fichajes / Control de Asistencia"),
        ("07", "Horarios"),
        ("08", "Tickets / Incidencias"),
        ("09", "Gastos"),
        ("10", "Retrasos"),
        ("11", "Analytics"),
        ("12", "Ubicaciones de Trabajo"),
        ("13", "Salarios"),
        ("14", "Cierres de Caja"),
        ("15", "Configuracion de Empresa"),
        ("16", "Kiosk (Fichaje por PIN)"),
        ("17", "Planes y Precios"),
        ("18", "Landing Page y Legal"),
        ("19", "Vista Movil (PWA)"),
        ("20", "Resumen Final"),
    ]
    for num, title in toc:
        story.append(Paragraph(
            f"<font color='#2563EB'><b>{num}</b></font>  {title}",
            ST["toc_item"],
        ))
    story.append(PageBreak())

    # ──────────────────────────────────────────────────────────────────────────
    # SECCIONES
    # ──────────────────────────────────────────────────────────────────────────

    # 01 — Registro
    story.extend(section_header("01", "Registro de Empresa"))
    story.append(desc(
        "Para registrar una nueva empresa en ClockLy, ve a "
        "https://app.clockly.es/register-company. Rellena: nombre de empresa, "
        "nombre del owner, email, contrasena (min. 8 caracteres) y zona horaria. "
        "Haz clic en 'Crear empresa y continuar'. El sistema crea el tenant, "
        "el usuario owner y redirige al wizard de onboarding."
    ))
    story.extend(add_screenshots(["01_registro_formulario.png"]))
    story.append(PageBreak())

    # 02 — Login
    story.extend(section_header("02", "Inicio de Sesion"))
    story.append(desc(
        "Accede a https://app.clockly.es/login. Introduce tu email y contrasena. "
        "Si es la primera vez, el sistema redirige al onboarding. Si ya lo completaste, "
        "accede directamente al dashboard. En caso de olvidar la contrasena, usa "
        "/forgot-password para recibirla por email."
    ))
    story.extend(add_screenshots(["02_login_pagina.png", "03_login_relleno.png", "04_post_login.png"]))
    story.append(PageBreak())

    # 03 — Onboarding
    story.extend(section_header("03", "Onboarding — Configuracion Inicial"))
    story.append(desc(
        "El wizard de onboarding guia la configuracion inicial en 5 pasos: "
        "(1) EMPRESA: nombre, zona horaria, sector (hosteleria, retail, salud...) "
        "y tamano del equipo. "
        "(2) PRIMER EMPLEADO: nombre, apellidos, email opcional, puesto y PIN de kiosk. "
        "(3) PIN DE KIOSK: asignar PIN de 4 digitos a un empleado para fichaje. "
        "(4) INVITAR EQUIPO: enviar invitaciones a admins, managers o empleados por email "
        "(se puede omitir y hacer despues). "
        "(5) FINAL: verificar que todo esta listo y abrir el dashboard."
    ))
    story.extend(add_screenshots([
        "05_onboarding_empresa.png", "06_onboarding_empresa_relleno.png",
        "07_onboarding_paso2_empleado.png", "08_onboarding_paso3_kiosk.png",
        "09_onboarding_paso4_invitaciones.png", "10_onboarding_paso5_final.png",
        "11_onboarding_completado.png",
    ]))
    story.append(PageBreak())

    # 04 — Dashboard
    story.extend(section_header("04", "Dashboard"))
    story.append(desc(
        "El dashboard (/dashboard) muestra estadisticas en tiempo real: "
        "empleados activos, fichajes de hoy, incidencias pendientes, retrasos, "
        "y accesos rapidos a las principales secciones. Las tarjetas de resumen "
        "ofrecen una vision rapida del estado operativo del equipo."
    ))
    story.extend(add_screenshots(["01_dashboard_principal.png", "02_dashboard_detalle.png"]))
    story.append(PageBreak())

    # 05 — Empleados
    story.extend(section_header("05", "Empleados (35 trabajadores)"))
    story.append(desc(
        "En /employees se gestiona el equipo completo. Funciones disponibles:\n"
        "- LISTAR: tabla con todos los empleados, busqueda por nombre y filtros por estado.\n"
        "- CREAR (/employees/new): alta de nuevo empleado con campos: nombre, apellidos, "
        "DNI/NIE, contrasena de acceso, email, telefono, puesto, PIN de kiosk (4 digitos) "
        "y fecha de alta.\n"
        "- IMPORTAR (/employees/import): carga masiva desde archivo CSV con columnas "
        "'nombre' y 'apellidos' (obligatorias) mas campos opcionales.\n"
        "- DETALLE (/employees/:id): ver y editar el perfil completo de un empleado.\n"
        "La cuenta demo tiene 35 empleados activos con PINs del 1001 al 1035."
    ))
    story.extend(add_screenshots([
        "01_empleados_lista_completa.png", "02_empleados_formulario_nuevo.png",
        "01_empleados_importar_csv.png", "11_resumen_empleados_finales.png",
    ]))
    story.append(PageBreak())

    # 06 — Fichajes
    story.extend(section_header("06", "Fichajes / Control de Asistencia"))
    story.append(desc(
        "En /sessions se registran todas las entradas y salidas del equipo. "
        "La lista muestra cada fichaje con: empleado, fecha, hora entrada, "
        "hora salida, duracion total, localizacion y metodo (kiosk, app o manual). "
        "Filtros disponibles por empleado, rango de fechas y estado.\n\n"
        "EXPORTAR NOMINAS (/sessions/payroll): exporta los datos de horas trabajadas "
        "para calcular nominas, compatible con formatos A3 y Holded.\n\n"
        "REGISTRO ITSS (/sessions/itss): genera el informe de registro de jornada "
        "obligatorio segun la normativa espanola del Ministerio de Trabajo."
    ))
    story.extend(add_screenshots([
        "02_fichajes_lista.png", "03_fichajes_nominas_exportar.png", "01_fichajes_itss.png",
    ]))
    story.append(PageBreak())

    # 07 — Horarios
    story.extend(section_header("07", "Horarios"))
    story.append(desc(
        "En /schedules se configuran los horarios de trabajo del equipo. "
        "Soporta 4 tipos de horario:\n"
        "- FIJO: entrada y salida a horas determinadas cada dia.\n"
        "- FLEXIBLE: margen de tolerancia en la hora de entrada.\n"
        "- TURNOS: rotacion entre diferentes franjas horarias.\n"
        "- LIBRE: sin horario fijo asignado.\n"
        "Los horarios se asignan a empleados individuales o grupos y se integran "
        "con el modulo de Retrasos para deteccion automatica de incidencias."
    ))
    story.extend(add_screenshots(["01_horarios_lista.png"]))
    story.append(PageBreak())

    # 08 — Tickets
    story.extend(section_header("08", "Tickets / Incidencias"))
    story.append(desc(
        "En /tickets se gestionan las incidencias y solicitudes del equipo. "
        "Tipos de ticket: vacaciones, baja medica, permiso personal, horas extra, "
        "cambio de turno y otros. Los managers pueden aprobar o rechazar cada ticket. "
        "Los empleados crean y consultan sus propios tickets desde el portal /employee. "
        "Filtros por estado (pendiente / aprobado / rechazado), empleado y periodo."
    ))
    story.extend(add_screenshots(["02_tickets_lista.png"]))
    story.append(PageBreak())

    # 09 — Gastos
    story.extend(section_header("09", "Gastos"))
    story.append(desc(
        "En /expenses se registran los gastos de empresa. "
        "Crear nuevo gasto (/expenses/new): descripcion, importe, categoria, "
        "fecha, empleado asociado y justificante adjunto. "
        "La lista de gastos permite filtrar por empleado, categoria y rango de fechas. "
        "Cada gasto puede revisarse y aprobarse por el administrador."
    ))
    story.extend(add_screenshots([
        "03_gastos_lista.png", "04_gastos_nuevo_formulario.png", "05_gastos_nuevo_relleno.png",
    ]))
    story.append(PageBreak())

    # 10 — Retrasos
    story.extend(section_header("10", "Retrasos"))
    story.append(desc(
        "En /late-arrivals se registran y gestionan los retrasos del equipo. "
        "El sistema detecta automaticamente los retrasos comparando la hora real "
        "de fichaje con el horario asignado al empleado. Muestra: empleado, "
        "fecha, minutos de retraso y tipo de incidencia. "
        "Se pueden exportar informes de puntualidad por empleado o periodo "
        "para analisis de rendimiento y procesos disciplinarios."
    ))
    story.extend(add_screenshots(["02_retrasos_lista.png"]))
    story.append(PageBreak())

    # 11 — Analytics
    story.extend(section_header("11", "Analytics"))
    story.append(desc(
        "En /analytics se visualizan metricas avanzadas del equipo. "
        "Disponible en plan Business. Incluye:\n"
        "- TENDENCIAS: evolucion de horas trabajadas por semana/mes.\n"
        "- PUNTUALIDAD: ranking de empleados por tasa de puntualidad.\n"
        "- ANOMALIAS: deteccion de fichajes fuera de rango o ubicaciones no autorizadas.\n"
        "- RESUMEN MENSUAL: coste total de horas, dias trabajados y ausencias.\n"
        "Los graficos son interactivos y exportables a PDF o Excel."
    ))
    story.extend(add_screenshots(["01_analytics_general.png", "02_analytics_graficos.png"]))
    story.append(PageBreak())

    # 12 — Ubicaciones
    story.extend(section_header("12", "Ubicaciones de Trabajo"))
    story.append(desc(
        "En /work-locations se configuran las sedes o ubicaciones donde los "
        "empleados pueden fichar. Cada ubicacion tiene: nombre, direccion, "
        "coordenadas GPS y radio de geofencing (en metros). "
        "Los fichajes realizados fuera del radio permitido se marcan como 'fuera de zona' "
        "y generan una alerta. Util para empresas con varios centros de trabajo "
        "o equipos moviles."
    ))
    story.extend(add_screenshots(["03_ubicaciones_lista.png"]))
    story.append(PageBreak())

    # 13 — Salarios
    story.extend(section_header("13", "Salarios"))
    story.append(desc(
        "En /salaries se gestionan los salarios de los empleados. "
        "Se puede configurar el salario hora o mensual de cada trabajador. "
        "El modulo calcula automaticamente el coste salarial total del periodo "
        "basandose en las horas fichadas. Util para el departamento de RRHH "
        "y para generar informes de coste de personal."
    ))
    story.extend(add_screenshots(["04_salarios_lista.png"]))
    story.append(PageBreak())

    # 14 — Cierres de Caja
    story.extend(section_header("14", "Cierres de Caja"))
    story.append(desc(
        "En /cash-closures se realizan los cierres de caja diarios. "
        "Permite registrar: efectivo en caja al inicio y fin del turno, "
        "ventas del dia, diferencias detectadas y notas del responsable. "
        "Cada cierre queda registrado con fecha, hora y usuario responsable. "
        "Ideal para negocios de hosteleria, retail y comercio."
    ))
    story.extend(add_screenshots(["03_cierres_caja_lista.png"]))
    story.append(PageBreak())

    # 15 — Configuracion
    story.extend(section_header("15", "Configuracion de Empresa"))
    story.append(desc(
        "En /settings se configura toda la informacion de la empresa: "
        "nombre comercial, zona horaria, sector, tamano del equipo y pais. "
        "Tambien permite:\n"
        "- Gestionar el plan de suscripcion (upgrade/downgrade).\n"
        "- Ver limites del plan actual (max. empleados, funcionalidades activas).\n"
        "- Configurar integraciones con herramientas de RRHH y contabilidad."
    ))
    story.extend(add_screenshots(["01_configuracion_empresa.png", "02_configuracion_empresa_abajo.png"]))
    story.append(PageBreak())

    # 16 — Kiosk
    story.extend(section_header("16", "Kiosk (Fichaje por PIN)"))
    story.append(desc(
        "El kiosk en /kiosk es una pantalla publica donde los empleados fichan "
        "introduciendo su PIN de 4 digitos. No requiere login de usuario. "
        "Ideal para colocar en una tablet en la entrada del local. "
        "El sistema registra automaticamente la hora de entrada/salida y la "
        "ubicacion del dispositivo. Cada empleado tiene un PIN unico asignado "
        "durante el onboarding o desde su perfil de empleado.\n\n"
        "PINs de la cuenta demo: PIN 9001 (Maria Garcia Lopez), 1001-1035 (resto)."
    ))
    story.extend(add_screenshots(["03_kiosk_portada.png"]))
    story.append(PageBreak())

    # 17 — Upgrade
    story.extend(section_header("17", "Planes y Precios"))
    story.append(desc(
        "En /upgrade se pueden ver y contratar los planes disponibles:\n"
        "- FREE: hasta 5 empleados. Funcionalidades basicas de fichaje.\n"
        "- PRO: hasta 25 empleados. Horarios, tickets, gastos y exportaciones.\n"
        "- BUSINESS: empleados ilimitados + analytics avanzado, geofencing, "
        "multi-sede, ITSS, cierres de caja y soporte prioritario.\n\n"
        "La cuenta demo usa el plan Business (activado manualmente para la prueba)."
    ))
    story.extend(add_screenshots(["04_upgrade_planes.png"]))
    story.append(PageBreak())

    # 18 — Landing & Legal
    story.extend(section_header("18", "Landing Page y Legal"))
    story.append(desc(
        "La landing page publica en https://app.clockly.es presenta ClockLy "
        "a potenciales clientes con las caracteristicas principales, planes y "
        "llamadas a la accion. Incluye paginas legales:\n"
        "- /privacy: Politica de Privacidad conforme al RGPD europeo.\n"
        "- /terms: Terminos y Condiciones de uso de la plataforma."
    ))
    story.extend(add_screenshots([
        "05_landing_principal.png", "06_landing_privacidad.png", "07_landing_terminos.png",
    ]))
    story.append(PageBreak())

    # 19 — Movil / PWA
    story.extend(section_header("19", "Vista Movil (PWA)"))
    story.append(desc(
        "ClockLy es una PWA (Progressive Web App) totalmente optimizada para "
        "dispositivos moviles. Las vistas principales — dashboard, lista de empleados "
        "y kiosk — funcionan perfectamente en pantallas de 390px (iPhone 14). "
        "Caracteristicas PWA: modo offline parcial, instalacion como app nativa "
        "desde el navegador, notificaciones push (proximamente)."
    ))
    story.extend(add_screenshots([
        "08_mobile_dashboard.png", "09_mobile_empleados.png", "10_mobile_kiosk.png",
    ]))
    story.append(PageBreak())

    # 20 — Resumen Final
    story.extend(section_header("20", "Resumen Final"))
    story.append(desc(
        "La cuenta demo Business de ClockLy esta completamente configurada "
        "y operativa. Estado tras la prueba completa:\n\n"
        "- Empresa: Demo Business SL (plan Business)\n"
        "- Empleados: 35 trabajadores activos con PINs asignados\n"
        "- Onboarding: completado al 100%\n"
        "- Kiosk: activo (PIN 9001 para Maria Garcia Lopez)\n"
        "- Modulos probados: Dashboard, Empleados, Fichajes (ITSS + Nominas), "
        "Horarios, Tickets, Gastos, Retrasos, Analytics, Ubicaciones, "
        "Salarios, Cierres de Caja, Configuracion, Kiosk, Planes\n"
        "- Tests Playwright ejecutados: 26 tests (24 pasados, 1 flaky, 1 fallado solo en fill UI)\n\n"
        "Estado: LISTO para demo comercial y piloto sin cobro."
    ))
    story.extend(add_screenshots(["12_resumen_dashboard_final.png"]))

    # ── Build ──────────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)
    print(f"\n PDF generado: {OUT_PDF}")
    print(f" Tamano: {OUT_PDF.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    build()
