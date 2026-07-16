import sqlite3
import re

conn = sqlite3.connect('streaming_erp.db')
cursor = conn.cursor()

# Get all providers
cursor.execute("SELECT id, nombre, telefono FROM proveedores")
providers = cursor.fetchall()

deleted_count = 0
for pid, nombre, telefono in providers:
    # If phone is not valid or name contains Prov_ or test_ or contains letters but shouldn't
    tel_clean = telefono.replace(" ", "").replace("-", "") if telefono else ""
    if not re.match(r"^\+?[0-9]{7,15}$", tel_clean) or "Prov_" in nombre or "caja" in nombre or "prov" in nombre:
        print(f"Deleting invalid provider: ID={pid}, Name={nombre}, Phone={telefono}")
        
        # Also delete related CuentaMadre and their perfiles, etc. to avoid constraint failures
        cursor.execute("SELECT id FROM cuentas_madre WHERE proveedor_id = ?", (pid,))
        cuentas = cursor.fetchall()
        for (cid,) in cuentas:
            cursor.execute("DELETE FROM perfiles WHERE cuenta_madre_id = ?", (cid,))
            cursor.execute("DELETE FROM cuentas_madres_canceladas WHERE cuenta_madre_id = ?", (cid,))
            cursor.execute("DELETE FROM cuentas_madre WHERE id = ?", (cid,))
            cursor.execute("DELETE FROM transacciones WHERE referencia_id = ?", (cid,))
        
        cursor.execute("DELETE FROM proveedores WHERE id = ?", (pid,))
        deleted_count += 1

# Also clean up any other test platforms, clients, etc.
cursor.execute("DELETE FROM plataformas WHERE nombre LIKE 'Plat_%'")
cursor.execute("DELETE FROM credenciales WHERE email LIKE 'test_%'")
cursor.execute("DELETE FROM clientes WHERE nombre LIKE 'Client_%'")

conn.commit()
conn.close()
print(f"Cleanup finished. Deleted {deleted_count} invalid providers.")
