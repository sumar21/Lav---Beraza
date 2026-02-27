import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { initDb } from './src/db/index.ts';
import db from './src/db/index.ts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Initialize DB
  initDb();

  // --- API ROUTES ---

  // Auth
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, client_id: user.client_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, client_id: user.client_id } });
  });

  // Middleware for Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- ADMIN ROUTES ---

  // Clients
  app.get('/api/clients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const clients = db.prepare('SELECT * FROM clients').all();
    res.json(clients);
  });

  app.post('/api/clients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, stock_csv_url, tags_url, laundry_readings_url } = req.body;
    const info = db.prepare('INSERT INTO clients (name, stock_csv_url, tags_url, laundry_readings_url) VALUES (?, ?, ?, ?)').run(name, stock_csv_url, tags_url, laundry_readings_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/clients/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, stock_csv_url, tags_url, laundry_readings_url } = req.body;
    db.prepare('UPDATE clients SET name = ?, stock_csv_url = ?, tags_url = ?, laundry_readings_url = ? WHERE id = ?').run(name, stock_csv_url, tags_url, laundry_readings_url, req.params.id);
    res.json({ success: true });
  });

  // Users
  app.get('/api/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = db.prepare(`
      SELECT users.id, users.username, users.role, users.client_id, clients.name as client_name 
      FROM users 
      LEFT JOIN clients ON users.client_id = clients.id
    `).all();
    res.json(users);
  });

  app.post('/api/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { username, password, role, client_id } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    try {
      const info = db.prepare('INSERT INTO users (username, password_hash, role, client_id) VALUES (?, ?, ?, ?)').run(username, hash, role, client_id || null);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  // Garments
  app.get('/api/garments', authenticateToken, (req: any, res) => {
    const garments = db.prepare('SELECT * FROM garments').all();
    res.json(garments);
  });

  app.post('/api/garments', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, type, is_unique } = req.body;
    const info = db.prepare('INSERT INTO garments (name, type, is_unique) VALUES (?, ?, ?)').run(name, type, is_unique ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/garments/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, type, is_unique } = req.body;
    db.prepare('UPDATE garments SET name = ?, type = ?, is_unique = ? WHERE id = ?').run(name, type, is_unique ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/garments/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
      db.prepare('DELETE FROM garments WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Cannot delete garment in use' });
    }
  });

  // --- PACKS MANAGEMENT (Aggregated) ---
  app.get('/api/packs', authenticateToken, (req: any, res) => {
    // Get all unique garments (Packs)
    const packs = db.prepare("SELECT * FROM garments WHERE is_unique = 1").all();
    
    // For each pack, get its recipe
    const result = packs.map((p: any) => {
      const components = db.prepare(`
        SELECT pr.id, pr.component_garment_id, pr.quantity, g.name 
        FROM pack_recipes pr
        JOIN garments g ON pr.component_garment_id = g.id
        WHERE pr.pack_garment_id = ?
      `).all(p.id);
      return { ...p, components };
    });
    
    res.json(result);
  });

  app.post('/api/packs', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, components } = req.body; // components: [{ garment_id, quantity }]
    
    const insert = db.transaction(() => {
      // 1. Create Pack Garment
      const info = db.prepare("INSERT INTO garments (name, type, is_unique) VALUES (?, 'Pack', 1)").run(name);
      const packId = info.lastInsertRowid;
      
      // 2. Insert Components
      const insertRecipe = db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)');
      for (const comp of components) {
        insertRecipe.run(packId, comp.garment_id, comp.quantity);
      }
      return packId;
    });

    try {
      const packId = insert();
      res.json({ id: packId, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/packs/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, components } = req.body;
    const packId = req.params.id;

    const update = db.transaction(() => {
      // 1. Update Pack Name
      db.prepare("UPDATE garments SET name = ? WHERE id = ?").run(name, packId);
      
      // 2. Delete old recipe
      db.prepare("DELETE FROM pack_recipes WHERE pack_garment_id = ?").run(packId);
      
      // 3. Insert new recipe
      const insertRecipe = db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)');
      for (const comp of components) {
        insertRecipe.run(packId, comp.garment_id, comp.quantity);
      }
    });

    try {
      update();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/packs/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const packId = req.params.id;
    
    const del = db.transaction(() => {
      db.prepare("DELETE FROM pack_recipes WHERE pack_garment_id = ?").run(packId);
      db.prepare("DELETE FROM targets WHERE pack_garment_id = ?").run(packId);
      db.prepare("DELETE FROM garments WHERE id = ?").run(packId);
    });

    try {
      del();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Recipes (Legacy - keeping for safety but Packs API replaces it)
  app.get('/api/recipes', authenticateToken, (req: any, res) => {
    const recipes = db.prepare(`
      SELECT pr.*, g1.name as pack_name, g2.name as component_name 
      FROM pack_recipes pr
      JOIN garments g1 ON pr.pack_garment_id = g1.id
      JOIN garments g2 ON pr.component_garment_id = g2.id
    `).all();
    res.json(recipes);
  });

  app.post('/api/recipes', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { pack_garment_id, component_garment_id, quantity } = req.body;
    const info = db.prepare('INSERT INTO pack_recipes (pack_garment_id, component_garment_id, quantity) VALUES (?, ?, ?)').run(pack_garment_id, component_garment_id, quantity);
    res.json({ id: info.lastInsertRowid });
  });

  // Targets
  app.get('/api/targets', authenticateToken, (req: any, res) => {
    const targets = db.prepare(`
      SELECT t.*, c.name as client_name, g.name as pack_name
      FROM targets t
      JOIN clients c ON t.client_id = c.id
      JOIN garments g ON t.pack_garment_id = g.id
    `).all();
    res.json(targets);
  });

  app.post('/api/targets', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { client_id, pack_garment_id, target_quantity } = req.body;
    // Upsert logic
    const existing = db.prepare('SELECT id FROM targets WHERE client_id = ? AND pack_garment_id = ?').get(client_id, pack_garment_id);
    if (existing) {
       db.prepare('UPDATE targets SET target_quantity = ? WHERE id = ?').run(target_quantity, (existing as any).id);
       res.json({ id: (existing as any).id });
    } else {
       const info = db.prepare('INSERT INTO targets (client_id, pack_garment_id, target_quantity) VALUES (?, ?, ?)').run(client_id, pack_garment_id, target_quantity);
       res.json({ id: info.lastInsertRowid });
    }
  });

  // --- REINFORCEMENT REQUESTS ---

  app.get('/api/reinforcements', authenticateToken, (req: any, res) => {
    let query = `
      SELECT r.*, c.name as client_name, g.name as pack_name
      FROM reinforcement_requests r
      JOIN clients c ON r.client_id = c.id
      JOIN garments g ON r.pack_garment_id = g.id
    `;
    let params: any[] = [];

    if (req.user.role !== 'admin') {
      query += ' WHERE r.client_id = ?';
      params.push(req.user.client_id);
    }
    
    query += ' ORDER BY r.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  });

  app.post('/api/reinforcements', authenticateToken, (req: any, res) => {
    const { pack_garment_id, requested_quantity } = req.body;
    const client_id = req.user.role === 'admin' ? req.body.client_id : req.user.client_id;

    if (!client_id || !pack_garment_id || !requested_quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const info = db.prepare('INSERT INTO reinforcement_requests (client_id, pack_garment_id, requested_quantity) VALUES (?, ?, ?)')
      .run(client_id, pack_garment_id, requested_quantity);
    
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/reinforcements/:id/status', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { status } = req.body;
    
    if (!['Pendiente', 'En Gestión', 'Enviado', 'Completado'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE reinforcement_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    
    res.json({ success: true });
  });

  // --- DASHBOARD DATA ---

  app.get('/api/dashboard-data', authenticateToken, async (req: any, res) => {
    let clientId = req.user.client_id;

    // If admin, allow selecting client via query param or default to first client
    if (req.user.role === 'admin') {
      if (req.query.clientId) {
        clientId = req.query.clientId;
      } else {
        const firstClient: any = db.prepare('SELECT id FROM clients LIMIT 1').get();
        if (firstClient) clientId = firstClient.id;
      }
    }

    if (!clientId) return res.status(400).json({ error: 'User not assigned to a client' });

    const client: any = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    try {
      let stockCounts: Record<string, Record<string, number>> = {}; // { Location: { GarmentName: Count } }
      let totalCounts: Record<string, number> = {}; // { GarmentName: Count }
      let totalStockItems = 0;

      // 1. Fetch Tags Mapping (EPC -> Garment Name)
      // Format: rfid_dump_it.csv (Maestro)
      // Expected: EPC, Name, ... (CSV)
      let epcMap = new Map<string, string>();
      
      // Specific mapping for Guemes - REMOVED as DB now matches CSV names
      // const nameMapping: Record<string, string> = { ... };

      if (client.tags_url && client.tags_url.startsWith('http')) {
        try {
          const tagsResponse = await axios.get(client.tags_url);
          // The file might not have headers or might have specific ones. 
          // Let's try to parse without headers first to inspect rows.
          const tagsData = parse(tagsResponse.data, { 
            columns: false, 
            trim: true, 
            skip_empty_lines: true,
            relax_column_count: true,
            relax_quotes: true,
            delimiter: [',', ';', '\t']
          });
          
          tagsData.forEach((row: any[]) => {
            // Adjust indices based on actual file content structure
            // col 0 is EPC, col 1 is codigo_barra, col 2 is numero_de_articulo (Name)
            if (row.length >= 3) {
              const epc = row[0].trim();
              const rawName = row[2].trim();
              if (epc && rawName && epc !== 'epc') {
                // Use raw name directly as it matches DB now
                epcMap.set(epc, rawName);
              }
            }
          });
          console.log(`Loaded ${epcMap.size} tags from maestro.`);
        } catch (e: any) {
          console.error('Error fetching tags:', e.message);
        }
      }

      // 2. Fetch Stock Data (Cabin)
      // Format: ont_cab_nro1.csv
      // Expected: List of EPCs present in the cabin
      if (client.stock_csv_url && client.stock_csv_url.startsWith('http')) {
         try {
           const response = await axios.get(client.stock_csv_url);
           // This file likely contains just EPCs or EPC,Timestamp
           const csvData = parse(response.data, { 
             columns: false, 
             trim: true, 
             skip_empty_lines: true,
             relax_column_count: true,
             relax_quotes: true,
             delimiter: [',', ';', '\t']
           });
           
           const locationName = 'CAB-01'; // Hardcoded for this specific URL context
           stockCounts[locationName] = {};
  
           csvData.forEach((row: any[]) => {
              // col 0 is codigoCAB, col 1 is codigoUsuario, col 2 is codigoRFID (EPC)
              if (row.length < 3) return;
              const epc = row[2]?.trim();
              if (!epc || epc === 'codigoRFID' || epc === '----------') return;

              // Resolve name from Maestro
              let name = epcMap.get(epc) || 'Unknown Tag';
              
              // Only count known garments to avoid noise
              if (name !== 'Unknown Tag') {
                totalStockItems++;
                // Count the specific garment (e.g., SG EQ UNIV EST)
                if (!stockCounts[locationName][name]) stockCounts[locationName][name] = 0;
                stockCounts[locationName][name]++;
    
                if (!totalCounts[name]) totalCounts[name] = 0;
                totalCounts[name]++;
              }
           });
           console.log(`Processed stock for ${locationName}`);
         } catch (e: any) {
            console.error('Error fetching stock:', e.message);
         }
      } else if (client.stock_csv_url === 'demo') {
         // ... existing demo logic ...
         const garments: any[] = db.prepare('SELECT * FROM garments').all();
         const locations = ['CAB-01', 'CAB-02', 'CAB-03'];
         
         for (let i = 0; i < 200; i++) {
            const g = garments[Math.floor(Math.random() * garments.length)];
            const loc = locations[Math.floor(Math.random() * locations.length)];
            
            if (!stockCounts[loc]) stockCounts[loc] = {};
            if (!stockCounts[loc][g.name]) stockCounts[loc][g.name] = 0;
            stockCounts[loc][g.name]++;

            if (!totalCounts[g.name]) totalCounts[g.name] = 0;
            totalCounts[g.name]++;
         }
      }

      // Fetch Recipes and Targets
      const recipes = db.prepare('SELECT * FROM pack_recipes').all();
      const targets = db.prepare('SELECT * FROM targets WHERE client_id = ?').all(clientId);
      const garments = db.prepare('SELECT * FROM garments').all();
      
      const garmentMap = new Map(garments.map((g: any) => [g.id, g]));

      // 3. Fetch Consumption Data (Laundry Readings)
      // Format: lecturasZonaSuciaUltimos2Dias.txt
      // Expected: EPC, Timestamp, ...
      let laundryCount = 0;
      let laundryCounts: Record<string, number> = {};
      let laundryByDay: Record<string, Record<string, number>> = {};
      
      // Filter based on garments in DB
      const validGarmentNames = new Set(garments.map((g: any) => g.name));

      if (client.laundry_readings_url && client.laundry_readings_url.startsWith('http')) {
        try {
          const laundryResponse = await axios.get(client.laundry_readings_url);
          const laundryData = parse(laundryResponse.data, {
            columns: false,
            trim: true,
            skip_empty_lines: true,
            relax_column_count: true,
            relax_quotes: true,
            delimiter: [',', ';', '\t']
          });
          
          // Count only items that belong to our packs
          laundryData.forEach((row: any[]) => {
             const epc = row[0]?.trim();
             const timestamp = row[1]?.trim();
             
             if (epc) {
                const name = epcMap.get(epc);
                if (name && validGarmentNames.has(name)) {
                   laundryCount++;
                   if (!laundryCounts[name]) laundryCounts[name] = 0;
                   laundryCounts[name]++;

                   // Extract day (YYYYMMDD)
                   if (timestamp) {
                     const day = timestamp.split(' ')[0];
                     if (!laundryByDay[day]) laundryByDay[day] = {};
                     if (!laundryByDay[day][name]) laundryByDay[day][name] = 0;
                     laundryByDay[day][name]++;
                   }
                }
             }
          });
          console.log(`Laundry readings count (filtered): ${laundryCount}`);
        } catch (e: any) {
          console.error('Error fetching laundry readings:', e.message);
        }
      }

      // Map DB names to CSV names if needed (normalization) - for now assume exact match

      // Helper to calculate pack integrity
      const calculateIntegrity = (locationCounts: Record<string, number>, consumptionCounts: Record<string, number> = {}) => {
         const integrityAlerts: any[] = [];
         const replenishmentAlerts: any[] = [];
         const packStock: any[] = [];

         // Identify Packs
         const packs = garments.filter((g: any) => g.is_unique);
         
         packs.forEach((pack: any) => {
            const packName = pack.name;
            const count = locationCounts[packName] || 0;
            
            // Find Target
            const target: any = targets.find((t: any) => t.pack_garment_id === pack.id);
            const targetQty = target ? target.target_quantity : 0;

            // "A Reponer" is the difference between target and current stock
            const consumed = Math.max(0, targetQty - count);

            const packRecipes: any[] = recipes.filter((r: any) => r.pack_garment_id === pack.id);
            
            // 1. Integrity Alerts: Check components against CURRENT pack count
            const missingIntegrity: any[] = [];
            packRecipes.forEach((recipe: any) => {
               const component = garmentMap.get(recipe.component_garment_id);
               if (component) {
                  const requiredForCurrent = count * recipe.quantity;
                  const available = locationCounts[component.name] || 0;
                  if (available < requiredForCurrent) {
                     missingIntegrity.push({
                        name: component.name,
                        required: requiredForCurrent,
                        available,
                        missing: requiredForCurrent - available
                     });
                  }
               }
            });

            if (missingIntegrity.length > 0) {
               integrityAlerts.push({
                  packName,
                  packCount: count,
                  targetQty: targetQty,
                  missingComponents: missingIntegrity
               });
            }

            // 2. Replenishment Alerts: Check components against TARGET pack count
            const missingReplenishment: any[] = [];
            packRecipes.forEach((recipe: any) => {
               const component = garmentMap.get(recipe.component_garment_id);
               if (component) {
                  const requiredForTarget = targetQty * recipe.quantity;
                  const available = locationCounts[component.name] || 0;
                  if (available < requiredForTarget) {
                     missingReplenishment.push({
                        name: component.name,
                        required: requiredForTarget,
                        available,
                        missing: requiredForTarget - available
                     });
                  }
               }
            });

            if (missingReplenishment.length > 0 && consumed > 0) {
               replenishmentAlerts.push({
                  packId: pack.id,
                  packName,
                  packCount: count,
                  targetQty: targetQty,
                  missingPacks: consumed,
                  missingComponents: missingReplenishment
               });
            }

            packStock.push({
               id: pack.id,
               name: packName,
               current: count,
               consumed: consumed,
               target: targetQty,
               delta: count - targetQty
            });
         });

         return { packStock, integrityAlerts, replenishmentAlerts };
      };

      // Global KPIs
      const globalStats = calculateIntegrity(totalCounts, laundryCounts);
      
      // Per Cabin KPIs
      const cabinStats: Record<string, any> = {};
      Object.keys(stockCounts).forEach(cab => {
         cabinStats[cab] = calculateIntegrity(stockCounts[cab]);
      });

      // Filter totalCounts to only include valid garments for stockComposition
      const stockComposition: Record<string, number> = {};
      Object.keys(totalCounts).forEach(name => {
         if (validGarmentNames.has(name) || name === 'SG EQ UNIV EST') {
            stockComposition[name] = totalCounts[name];
         }
      });

      // Calculate component targets based on pack targets
      const componentTargets: Record<string, number> = {};
      const packs = garments.filter((g: any) => g.is_unique);
      packs.forEach((pack: any) => {
         const target: any = targets.find((t: any) => t.pack_garment_id === pack.id);
         const targetQty = target ? target.target_quantity : 0;
         
         const packRecipes: any[] = recipes.filter((r: any) => r.pack_garment_id === pack.id);
         packRecipes.forEach((recipe: any) => {
            const component = garmentMap.get(recipe.component_garment_id);
            if (component) {
               if (!componentTargets[component.name]) componentTargets[component.name] = 0;
               componentTargets[component.name] += targetQty * recipe.quantity;
            }
         });
      });

      res.json({
         global: globalStats,
         cabins: cabinStats,
         rawCounts: totalCounts,
         laundryCounts: laundryCounts,
         laundryCount: laundryCount,
         laundryByDay: laundryByDay,
         stockComposition: stockComposition,
         totalStockItems: totalStockItems,
         componentTargets: componentTargets
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch or process stock data' });
    }
  });


  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
