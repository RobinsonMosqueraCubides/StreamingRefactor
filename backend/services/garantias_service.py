from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import timedelta
from db.models import Venta, DetalleVenta, Perfil, CuentaMadre, Transaccion, GarantiaCliente, EstadoCuenta, TipoTransaccion
from db.database import get_or_404
from schemas.garantias_schemas import GarantiaCreate
from core.exceptions import BusinessRuleError

async def get_garantias(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(GarantiaCliente).order_by(GarantiaCliente.id.desc()).offset(skip).limit(limit))
    return result.scalars().all()

async def registrar_garantia(db: AsyncSession, garantia: GarantiaCreate):
    # 1. Obtener el detalle de la venta
    db_detalle = await get_or_404(
        db,
        DetalleVenta,
        garantia.detalle_venta_id,
        options=[selectinload(DetalleVenta.cuenta_madre)]
    )

    # 2. Obtener la venta asociada y el perfil anterior
    db_venta = await get_or_404(db, Venta, db_detalle.venta_id)

    perfil_anterior_id = db_detalle.perfil_id
    if not perfil_anterior_id:
        raise BusinessRuleError("Este detalle de venta no tiene un perfil asociado para aplicar garantía.")

    perfil_anterior = await get_or_404(db, Perfil, perfil_anterior_id)

    # 3. Lógica según el tipo de garantía
    tipo = garantia.tipo_garantia.upper()
    db_gar = None

    try:
        if tipo == 'REEMBOLSO':
            if not garantia.monto_reembolso or not garantia.entidad_reembolso:
                raise BusinessRuleError("Para la garantía de REEMBOLSO son obligatorios el monto_reembolso y la entidad_reembolso.")
            
            # Devolución de dinero: No se permite cambiar recurso ni extender días
            # Liberar o reportar el recurso anterior
            if garantia.liberar_recurso_anterior:
                perfil_anterior.asignado = False
                perfil_anterior.reportado = False
            else:
                perfil_anterior.asignado = True
                perfil_anterior.reportado = True

            # Crear egreso contable
            db_trans = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="REEMBOLSO_GARANTIA",
                monto=garantia.monto_reembolso,
                entidad=garantia.entidad_reembolso,
                referencia_id=db_venta.id
            )
            db.add(db_trans)

            db_gar = GarantiaCliente(
                detalle_venta_id=db_detalle.id,
                perfil_anterior_id=perfil_anterior_id,
                perfil_nuevo_id=None,
                dias_extendidos=0,
                resuelto=True
            )

        elif tipo == 'CAMBIO_RECURSO':
            # Cambio de cuenta o pantalla
            # Liberar o reportar el recurso anterior
            if garantia.liberar_recurso_anterior:
                perfil_anterior.asignado = False
                perfil_anterior.reportado = False
            else:
                perfil_anterior.asignado = True
                perfil_anterior.reportado = True

            # Buscar un nuevo perfil libre de la misma plataforma
            plataforma_id = db_detalle.cuenta_madre.plataforma_id
            stmt_new = (
                select(Perfil)
                .join(CuentaMadre)
                .where(
                    CuentaMadre.plataforma_id == plataforma_id,
                    CuentaMadre.estado == EstadoCuenta.ACTIVA,
                    Perfil.asignado == False,
                    Perfil.reportado == False
                )
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            res_new = await db.execute(stmt_new)
            nuevo_perfil = res_new.scalar_one_or_none()

            if not nuevo_perfil:
                raise BusinessRuleError("No hay perfiles disponibles en el inventario para realizar la reasignación.")

            # Asignar nuevo perfil al cliente
            nuevo_perfil.asignado = True
            db_detalle.perfil_id = nuevo_perfil.id
            db_detalle.cuenta_madre_id = nuevo_perfil.cuenta_madre_id

            # Extender fecha de corte de la venta si se especifica
            if garantia.dias_extendidos > 0:
                db_venta.fecha_corte = db_venta.fecha_corte + timedelta(days=garantia.dias_extendidos)

            db_gar = GarantiaCliente(
                detalle_venta_id=db_detalle.id,
                perfil_anterior_id=perfil_anterior_id,
                perfil_nuevo_id=nuevo_perfil.id,
                dias_extendidos=garantia.dias_extendidos,
                resuelto=True
            )

        elif tipo in ('CAMBIO_CLAVE', 'AGREGAR_DIAS'):
            # Mantener el mismo perfil y opcionalmente extender la fecha de corte
            if garantia.dias_extendidos > 0:
                db_venta.fecha_corte = db_venta.fecha_corte + timedelta(days=garantia.dias_extendidos)

            db_gar = GarantiaCliente(
                detalle_venta_id=db_detalle.id,
                perfil_anterior_id=perfil_anterior_id,
                perfil_nuevo_id=None,
                dias_extendidos=garantia.dias_extendidos,
                resuelto=True
            )
        else:
            raise BusinessRuleError(f"Tipo de garantía '{garantia.tipo_garantia}' no reconocido.")

        db.add(db_gar)
        await db.commit()
        await db.refresh(db_gar)
        return db_gar
    except Exception as e:
        await db.rollback()
        raise e
