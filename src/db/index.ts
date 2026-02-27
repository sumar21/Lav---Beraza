import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('laundry_rfid.db');

export function initDb() {
  // Clients
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      stock_csv_url TEXT,
      tags_url TEXT,
      laundry_readings_url TEXT
    )
  `);

  // Add columns if they don't exist (migration for existing db)
  try {
    db.prepare('ALTER TABLE clients ADD COLUMN tags_url TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE clients ADD COLUMN laundry_readings_url TEXT').run();
  } catch (e) {}

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
      client_id INTEGER,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  // Garments (Maestro de artículos)
  db.exec(`
    CREATE TABLE IF NOT EXISTS garments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('Pack', 'Prenda Blanca', 'Otros')) NOT NULL,
      is_unique BOOLEAN DEFAULT 0
    )
  `);

  // Pack Recipes (Configuración de Packs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pack_garment_id INTEGER NOT NULL,
      component_garment_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (pack_garment_id) REFERENCES garments (id),
      FOREIGN KEY (component_garment_id) REFERENCES garments (id)
    )
  `);

  // Targets
  db.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      pack_garment_id INTEGER NOT NULL,
      target_quantity INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (pack_garment_id) REFERENCES garments (id)
    )
  `);

  // Reinforcement Requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS reinforcement_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      pack_garment_id INTEGER NOT NULL,
      requested_quantity INTEGER NOT NULL,
      status TEXT CHECK(status IN ('Pendiente', 'En Gestión', 'Enviado', 'Completado')) NOT NULL DEFAULT 'Pendiente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (pack_garment_id) REFERENCES garments (id)
    )
  `);

  // Seed Admin User if not exists
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('Admin user created: admin / admin123');
  }
  
  // Seed Demo Data - REMOVED as per user request
  /* 
  const demoClient = db.prepare('SELECT * FROM clients WHERE name = ?').get('Demo Hospital');
  if (!demoClient) {
     // ... demo seeding code ...
  }
  */

  // --- CLEANUP: Remove items requested by user ---
  const itemsToDelete = ['Pack QX', 'Camisolín', 'Campo Quirúrgico'];
  for (const name of itemsToDelete) {
      const item: any = db.prepare('SELECT id FROM garments WHERE name = ?').get(name);
      if (item) {
          db.prepare('DELETE FROM pack_recipes WHERE pack_garment_id = ? OR component_garment_id = ?').run(item.id, item.id);
          db.prepare('DELETE FROM targets WHERE pack_garment_id = ?').run(item.id);
          db.prepare('DELETE FROM garments WHERE id = ?').run(item.id);
      }
  }

  // Seed Sanatorio Guemes
  const guemesClient = db.prepare('SELECT * FROM clients WHERE name = ?').get('Sanatorio Guemes');
  if (!guemesClient) {
    const info = db.prepare('INSERT INTO clients (name, stock_csv_url, tags_url, laundry_readings_url) VALUES (?, ?, ?, ?)').run(
      'Sanatorio Guemes',
      'http://lavaderobegui.dyndns.org/rfid/guemes/ont_cab_nro1.csv',
      'http://lavaderobegui.dyndns.org/rfid/rfid_dump_it.csv',
      'http://lavaderobegui.dyndns.org/rfid/lecturasZonaSuciaUltimos2Dias.txt'
    );
    const clientId = info.lastInsertRowid;
    
    // Guemes User
    const userHash = bcrypt.hashSync('123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role, client_id) VALUES (?, ?, ?, ?)').run('guemes', userHash, 'user', clientId);

    // Guemes Garments & Recipe
    // 1. Pack - SG EQ UNIV EST (The Pack Identifier)
    const packId = db.prepare("INSERT INTO garments (name, type, is_unique) VALUES ('SG EQ UNIV EST', 'Pack', 1)").run().lastInsertRowid;
    
    // 2. Components
    const chicoId = db.prepare("INSERT INTO garments (name, type, is_unique) VALUES ('RFID Campo Chico', 'Pack', 0)").run().lastInsertRowid;
    const grandeId = db.prepare("INSERT INTO garments (name, type, is_unique) VALUES ('RFID Campo Grande', 'Pack', 0)").run().lastInsertRowid;
    const qxId = db.prepare("INSERT INTO garments (name, type, is_unique) VALUES ('RFID Cam QX Gris', 'Pack', 0)").run().lastInsertRowid;

    // 3. Recipe
    db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(packId, chicoId, 4);
    db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(packId, grandeId, 6);
    db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(packId, qxId, 4);

    // 4. Target (Default 30)
    db.prepare('INSERT INTO targets (client_id, pack_garment_id, target_quantity) VALUES (?, ?, ?)').run(clientId, packId, 30);

  } else {
    // Ensure password is 123 for existing guemes user (migration fix)
    const newHash = bcrypt.hashSync('123', 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(newHash, 'guemes');

    // MIGRATION: Remove 'Pack - Universal' and make 'SG EQ UNIV EST' the unique pack
    const packUniversal: any = db.prepare("SELECT id FROM garments WHERE name = 'Pack - Universal'").get();
    const sgEqUnivEst: any = db.prepare("SELECT id FROM garments WHERE name = 'SG EQ UNIV EST'").get();

    if (packUniversal && sgEqUnivEst) {
      // Update recipes: change pack_garment_id to SG EQ UNIV EST
      db.prepare("UPDATE pack_recipes SET pack_garment_id = ? WHERE pack_garment_id = ? AND component_garment_id != ?").run(sgEqUnivEst.id, packUniversal.id, sgEqUnivEst.id);
      // Delete the recipe that links Pack - Universal to SG EQ UNIV EST
      db.prepare("DELETE FROM pack_recipes WHERE pack_garment_id = ? AND component_garment_id = ?").run(packUniversal.id, sgEqUnivEst.id);
      
      // Update targets
      db.prepare("UPDATE targets SET pack_garment_id = ? WHERE pack_garment_id = ?").run(sgEqUnivEst.id, packUniversal.id);
      
      // Update reinforcement requests
      db.prepare("UPDATE reinforcement_requests SET pack_garment_id = ? WHERE pack_garment_id = ?").run(sgEqUnivEst.id, packUniversal.id);

      // Delete 'Pack - Universal'
      db.prepare("DELETE FROM garments WHERE id = ?").run(packUniversal.id);

      // Make 'SG EQ UNIV EST' unique
      db.prepare("UPDATE garments SET is_unique = 1 WHERE id = ?").run(sgEqUnivEst.id);
    }
  }

  // --- FORCE SYNC GUEMES GARMENTS & RECIPES (Idempotent) ---
  
  const garmentsToSync = [
    { name: 'SG EQ UNIV EST', type: 'Pack', is_unique: 1 },
    { name: 'RFID Campo Chico', type: 'Pack', is_unique: 0 },
    { name: 'RFID Campo Grande', type: 'Pack', is_unique: 0 },
    { name: 'RFID Cam QX Gris', type: 'Pack', is_unique: 0 }
  ];

  for (const g of garmentsToSync) {
    const existing = db.prepare('SELECT * FROM garments WHERE name = ?').get(g.name);
    if (!existing) {
      db.prepare('INSERT INTO garments (name, type, is_unique) VALUES (?, ?, ?)').run(g.name, g.type, g.is_unique);
    } else {
      db.prepare('UPDATE garments SET type = ?, is_unique = ? WHERE name = ?').run(g.type, g.is_unique, g.name);
    }
  }

  // Re-establish Recipes
  const univ: any = db.prepare("SELECT id FROM garments WHERE name = 'SG EQ UNIV EST'").get();
  const chico: any = db.prepare("SELECT id FROM garments WHERE name = 'RFID Campo Chico'").get();
  const grande: any = db.prepare("SELECT id FROM garments WHERE name = 'RFID Campo Grande'").get();
  const qx: any = db.prepare("SELECT id FROM garments WHERE name = 'RFID Cam QX Gris'").get();

  if (univ && chico && grande && qx) {
      // Clear old recipes for this pack to avoid duplicates
      db.prepare('DELETE FROM pack_recipes WHERE pack_garment_id = ?').run(univ.id);
      
      // Insert recipes
      db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(univ.id, chico.id, 4);
      db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(univ.id, grande.id, 6);
      db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(univ.id, qx.id, 4);
      
      // Ensure Target exists
      const gClient: any = db.prepare('SELECT * FROM clients WHERE name = ?').get('Sanatorio Guemes');
      if (gClient) {
          const existingTarget = db.prepare('SELECT * FROM targets WHERE client_id = ? AND pack_garment_id = ?').get(gClient.id, univ.id);
          if (!existingTarget) {
             db.prepare('INSERT INTO targets (client_id, pack_garment_id, target_quantity) VALUES (?, ?, ?)').run(gClient.id, univ.id, 30);
          }
      }
  }
}

export default db;
