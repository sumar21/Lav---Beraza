import axios from 'axios';
import { parse } from 'csv-parse/sync';

async function test() {
  try {
    const res1 = await axios.get('http://lavaderobegui.dyndns.org/rfid/rfid_dump_it.csv');
    const tagsData = parse(res1.data, { 
      columns: false, 
      trim: true, 
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      delimiter: [',', ';', '\t']
    });
    
    let epcMap = new Map<string, string>();
    tagsData.forEach((row: any[]) => {
      if (row.length >= 3) {
        const epc = row[0].trim();
        const name = row[2].trim();
        if (epc && name && epc !== 'epc') {
          epcMap.set(epc, name);
        }
      }
    });
    console.log(`Loaded ${epcMap.size} tags from maestro.`);

    const res3 = await axios.get('http://lavaderobegui.dyndns.org/rfid/lecturasZonaSuciaUltimos2Dias.txt');
    const laundryData = parse(res3.data, {
      columns: false,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      delimiter: [',', ';', '\t']
    });

    console.log(`Laundry rows: ${laundryData.length}`);
    if (laundryData.length > 0) {
      console.log('Sample laundry row 0:', laundryData[0]);
      console.log('Sample laundry row 1:', laundryData[1]);
    }

    let laundryCount = 0;
    let sgEqCount = 0;
    let itemCounts: Record<string, number> = {};
    
    laundryData.forEach((row: any[]) => {
      const epc = row[0]?.trim();
      if (epc) {
        const name = epcMap.get(epc);
        if (name) {
          laundryCount++;
          if (name === 'SG EQ UNIV EST') sgEqCount++;
          if (!itemCounts[name]) itemCounts[name] = 0;
          itemCounts[name]++;
        }
      }
    });

    console.log(`Laundry items found in maestro: ${laundryCount}`);
    console.log(`Laundry SG EQ UNIV EST count: ${sgEqCount}`);
    console.log('Top 10 items in laundry:');
    Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, count]) => console.log(`${name}: ${count}`));

  } catch (e) {
    console.error(e);
  }
}

test();