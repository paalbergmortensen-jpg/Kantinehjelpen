import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";


const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

export interface AppSettings {
  cronDay: number;
  recipients: string[];
  threshold: number;
  productionNumber?: string;
}

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading settings.json", err);
  }
  return {
    cronDay: 1,
    recipients: ["paalbergmortensen@gmail.com"],
    threshold: 200,
    productionNumber: ""
  };
}

function saveSettings(settings: AppSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}


import { google } from 'googleapis';
import { getAdminDb } from "./src/lib/firebaseAdmin.js";


// ------------------------------------------------------------------
// PLASSHOLDER FOR DIN LOGIKK
// ------------------------------------------------------------------
async function generateEmailContent(): Promise<{ subject: string; html: string; text: string; csvContent?: string, toInvoice: any[] }> {
  const settings = loadSettings();
  try {
    const db = getAdminDb();
    const usersSnap = await db.collection("users").get();
    
    interface UserDoc {
      id: string;
      ansattNr: string;
      ressursNr: string;
      fullName: string;
      balance: number;
    }
    
    // Convert to array
    const allUsers: UserDoc[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      allUsers.push({
        id: doc.id,
        ansattNr: data.ansattNr || '',
        ressursNr: data.ressursNr || '',
        fullName: data.fullName || '',
        balance: data.balance || 0
      });
    });

    const threshold = settings.threshold;
    const toInvoice = allUsers.filter(u => u.balance >= threshold);

    let text = `Lunsjoppgjør / Kantinetrekk for ${new Date().toLocaleString('nb-NO', { month: 'long', year: 'numeric' })}\n`;
    text += `Grense for trekk: ${threshold} kr\n\n`;
    
    let html = `<h2>Lunsjoppgjør / Kantinetrekk for ${new Date().toLocaleString('nb-NO', { month: 'long', year: 'numeric' })}</h2>`;
    html += `<p>Grense for trekk: <strong>${threshold} kr</strong></p>`;

    if (toInvoice.length === 0) {
      text += `Ingen ansatte har overskredet grensen denne måneden.`;
      html += `<p>Ingen ansatte har overskredet grensen denne måneden.</p>`;
    } else {
      text += `Følgende ansatte skal trekkes i lønn:\n\n`;
      html += `<table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">AnsattNr</th>
                    <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">RessursNr</th>
                    <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Navn</th>
                    <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Beløp</th>
                  </tr>
                </thead>
                <tbody>`;

      toInvoice.forEach(user => {
        text += `- ${user.fullName} | AnsattNr: ${user.ansattNr} | RessursNr: ${user.ressursNr} -> Trekkes: ${user.balance.toFixed(2)} kr\n`;
        html += `<tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.ansattNr}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.ressursNr}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.fullName}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.balance.toFixed(2)} kr</td>
                 </tr>`;
      });
      html += `</tbody></table>`;
    }

    let csvContent = "";
    if (toInvoice.length > 0) {
      csvContent += "\uFEFF";
      csvContent += `Produksjonsnummer:;${settings.productionNumber || ''};Må utfylles\n`;
      csvContent += `Dagens dato:;${new Date().toLocaleDateString('nb-NO')};Må utfylles\n`;
      csvContent += `\n`;
      csvContent += `Ressnr;Tekst til lønnsslipp;Trekk;Notater\n`;
      
      const monthName = new Date().toLocaleString('nb-NO', { month: 'long' });
      toInvoice.forEach(user => {
        let trekkFormatert = user.balance.toFixed(2).replace('.', ',');
        csvContent += `${user.ressursNr};Kantinetrekk ${monthName};${trekkFormatert};${user.fullName}\n`;
      });
    }

    return {
      subject: `Kantineoppgjør (Automatisk trekk - ${toInvoice.length} ansatte)`,
      text,
      html,
      csvContent,
      toInvoice
    };

  } catch (err: any) {
    if (err.message && err.message.includes("FIREBASE_SERVICE_ACCOUNT")) {
      return {
        subject: "Feil med Månedlig Kantineoppgjør (Manglende tilgang)",
        text: "Kantineoppgjøret klarte ikke å kjøre automatisk.\n\nDu må sette opp FIREBASE_SERVICE_ACCOUNT i appens innstillinger (Secrets).\nI mellomtiden, logg inn i appen manuelt og send oppgjøret fra Admin panelet.",
        html: "<p>Kantineoppgjøret klarte ikke å kjøre automatisk.</p><p>Du må sette opp <strong>FIREBASE_SERVICE_ACCOUNT</strong> i appens innstillinger (Secrets) for at backend-serveren skal kunne lese fra databasen og oppdatere saldoer i bakgrunnen.</p><p>I mellomtiden, logg inn i Kantineappen manuelt og send ut oppgjøret derfra fra Admin panelet.</p>",
        toInvoice: []
      };
    }
    throw err;
  }
}


async function sendMonthlyEmail(recipients: string[], accessToken: string) {
  try {
    if (!accessToken) {
      return { error: "Mangler tilgangstoken fra Google for å sende e-post og opprette Sheets." };
    }
    
    if (!recipients || recipients.length === 0) {
      return { error: "Ingen mottakere konfigurert i oppsett." };
    }

    const { subject, html, text, csvContent, toInvoice } = await generateEmailContent();

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: 'v4', auth });
    const gmail = google.gmail({ version: 'v1', auth });

    // 1. Create a Google Sheet
    let sheetUrl = "";
    if (toInvoice.length > 0) {
      const monthName = new Date().toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Kantineoppgjør - ${monthName}`
          }
        }
      });
      
      const spreadsheetId = response.data.spreadsheetId;
      sheetUrl = response.data.spreadsheetUrl || "";
      
      if (spreadsheetId) {
        // Prepare rows based on the format user requested
        const rows = [
          ["Produksjonsnummer:", loadSettings().productionNumber || "", "Må utfylles"],
          ["Dagens dato:", new Date().toLocaleDateString('nb-NO'), "Må utfylles"],
          [], // Empty row
          ["Ressnr", "Tekst til lønnsslipp", "Trekk", "Notater"]
        ];
        
        const currentMonthWord = new Date().toLocaleString('nb-NO', { month: 'long' });
        toInvoice.forEach(user => {
          let trekkFormatert = user.balance.toFixed(2).replace('.', ',');
          rows.push([
            user.ressursNr, 
            `Kantinetrekk ${currentMonthWord}`, 
            trekkFormatert, 
            user.fullName
          ]);
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: rows
          }
        });
      }
    }

    // 2. Send email via Gmail
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    let messageBody = `To: ${recipients.join(', ')}\r\n`;
    messageBody += `Subject: ${utf8Subject}\r\n`;
    messageBody += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    
    let htmlContent = html;
    if (sheetUrl) {
      htmlContent += `<br><hr><br><h3>Dokumentasjon</h3><p>Du finner månedens oppgjør i dette automatisk opprettede regnearket:</p><p><a href="${sheetUrl}">Åpne Google Sheet med oppgjør</a></p>`;
      
      try {
        const db = getAdminDb();
        await db.collection("reports").add({
          createdAt: new Date().toISOString(),
          title: `Kantineoppgjør - ${new Date().toLocaleString('nb-NO', { month: 'long', year: 'numeric' })}`,
          url: sheetUrl,
          userCount: toInvoice.length
        });
      } catch (logErr) {
        console.error("Failed to save report to Firestore", logErr);
      }
    }

    messageBody += htmlContent;

    const encodedMessage = Buffer.from(messageBody)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log("Månedlig e-post og sheet sendt med suksess.");

    // ==========================================
    // NULLSTILL SALDO ETTER VELLYKKET UTSENDING!
    // ==========================================
    try {
      const db = getAdminDb();
      const settings = loadSettings();
      const usersSnap = await db.collection("users").get();
      const batch = db.batch();
      let resetCount = 0;
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.balance >= settings.threshold) {
            batch.update(doc.ref, { balance: 0 });
            resetCount++;
        }
      });
      if (resetCount > 0) {
        await batch.commit();
        console.log(`Nullstilte saldoen for ${resetCount} brukere i bakgrunnen.`);
      }
    } catch (err: any) {
      console.error("Sending gikk bra, men klarte ikke å nullstille saldo automatisk:", err.message);
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("Uventet feil i utsending:", err);
    return { error: err.message };
  }
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/settings", (req, res) => {
    res.json(loadSettings());
  });

  app.post("/api/settings", (req, res) => {
    try {
      const newSettings = req.body as AppSettings;
      saveSettings(newSettings);
            res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

    app.post("/api/trigger-monthly-email", async (req, res) => {
    try {
      const settings = loadSettings();
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Mangler Authorization header' });
      }
      const token = authHeader.split(' ')[1];
      
      const sendRes = await sendMonthlyEmail(settings.recipients, token);
      if (sendRes.error) {
        return res.status(500).json({ error: typeof sendRes.error === 'string' ? sendRes.error : sendRes.error.message || 'Ukjent feil' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/seed', async (req, res) => {
    try {
      const db = getAdminDb();
      const batch = db.batch();
      
      const MENU_ITEMS = [
        { name: '1 Brødskive m/pålegg', price: 15.00 },
        { name: '1 Knekkebrød m/pålegg', price: 10.00 },
        { name: 'Yoghurt', price: 15.00 },
        { name: 'Salatbar, liten', price: 25.00 },
        { name: 'Salatbar, stor', price: 40.00 }
      ];

      const usersToSeed = [
        { firstName: 'Rune', fullName: 'Gundersen, Rune', ansattNr: '12543', ressursNr: '602164', balance: 0 },
        { firstName: 'Cecilie', fullName: 'Jåsund, Cecilie Berntsen', ansattNr: '23346', ressursNr: '612610', balance: 0 },
        { firstName: 'Cathrine', fullName: 'Oftedahl, Cathrine', ansattNr: '15368', ressursNr: '605369', balance: 0 },
        { firstName: 'Hilde', fullName: 'Torgersen, Hilde', ansattNr: '13666', ressursNr: '603323', balance: 0 },
        { firstName: 'Ole Andreas', fullName: 'Bø, Ole Andreas', ansattNr: '13705', ressursNr: '603883', balance: 0 },
        { firstName: 'Arild', fullName: 'Eskeland, Arild', ansattNr: '13753', ressursNr: '603672', balance: 0 },
        { firstName: 'Einar', fullName: 'Espeland, Einar', ansattNr: '15386', ressursNr: '605403', balance: 0 },
        { firstName: 'Kristian', fullName: 'Fjelde, Kristian', ansattNr: '657289', ressursNr: '657289', balance: 0 },
        { firstName: 'Mari', fullName: 'Friestad, Mari', ansattNr: '22322', ressursNr: '611242', balance: 0 },
        { firstName: 'Thomas', fullName: 'Halleland, Thomas', ansattNr: '23659', ressursNr: '612872', balance: 0 },
        { firstName: 'Ronja Erika', fullName: 'Humblen, Ronja Erika', ansattNr: '657828', ressursNr: '657828', balance: 0 },
        { firstName: 'Marthe Synnøve', fullName: 'Johannessen, Marthe Synnøve Susort', ansattNr: '635360', ressursNr: '635360', balance: 0 },
        { firstName: 'Berit Helle', fullName: 'Jonsbråten, Berit Helle', ansattNr: '651043', ressursNr: '651043', balance: 0 },
        { firstName: 'Gina', fullName: 'Jøers, Gina', ansattNr: '657801', ressursNr: '657801', balance: 0 },
        { firstName: 'Gisle', fullName: 'Jørgensen, Gisle', ansattNr: '15379', ressursNr: '605266', balance: 0 },
        { firstName: 'Håkon', fullName: 'Kummermo, Håkon', ansattNr: '655693', ressursNr: '655693', balance: 0 },
        { firstName: 'Odd Rune', fullName: 'Kyllingstad, Odd Rune', ansattNr: '13756', ressursNr: '604017', balance: 0 },
        { firstName: 'Johan Mihle', fullName: 'Laugaland, Johan Mihle', ansattNr: '15396', ressursNr: '606297', balance: 0 },
        { firstName: 'Gunnar', fullName: 'Morsund, Gunnar', ansattNr: '15374', ressursNr: '604237', balance: 0 },
        { firstName: 'Øystein', fullName: 'Otterdal, Øystein', ansattNr: '15398', ressursNr: '605995', balance: 0 },
        { firstName: 'Marte', fullName: 'Skodje, Marte', ansattNr: '21887', ressursNr: '610579', balance: 0 },
        { firstName: 'Magnus', fullName: 'Stokka, Magnus', ansattNr: '21594', ressursNr: '610360', balance: 0 },
        { firstName: 'Lucas', fullName: 'Storsveen, Lucas Andreassen', ansattNr: '657784', ressursNr: '657784', balance: 0 },
        { firstName: 'Rosa', fullName: 'Villalobos, Rosa Iren', ansattNr: '20515', ressursNr: '609130', balance: 0 },
        { firstName: 'Even Hye', fullName: 'Barka, Even Hye Tytlandsvik', ansattNr: '642986', ressursNr: '642986', balance: 0 },
        { firstName: 'Ingvill', fullName: 'Bjorland, Ingvill', ansattNr: '23610', ressursNr: '613819', balance: 0 },
        { firstName: 'Simon Elias', fullName: 'Bogen, Simon Elias', ansattNr: '650052', ressursNr: '650052', balance: 0 },
        { firstName: 'Jon', fullName: 'Dagsland, Jon', ansattNr: '656884', ressursNr: '656884', balance: 0 },
        { firstName: 'Tom', fullName: 'Edvindsen, Tom', ansattNr: '15397', ressursNr: '606022', balance: 0 },
        { firstName: 'Øystein', fullName: 'Ellingsen, Øystein', ansattNr: '13668', ressursNr: '603319', balance: 0 },
        { firstName: 'Anett', fullName: 'Espeland, Anett Johansen', ansattNr: '15373', ressursNr: '604099', balance: 0 },
        { firstName: 'Eirik', fullName: 'Gjesdal, Eirik', ansattNr: '21044', ressursNr: '609735', balance: 0 },
        { firstName: 'Åse Karin', fullName: 'Hansen, Åse Karin', ansattNr: '11023', ressursNr: '606521', balance: 0 },
        { firstName: 'Thomas', fullName: 'Johnsen, Thomas Ystrøm', ansattNr: '15928', ressursNr: '610081', balance: 0 },
        { firstName: 'Lise Marit', fullName: 'Kalstad, Lise Marit', ansattNr: '20286', ressursNr: '611714', balance: 0 },
        { firstName: 'Per Øystein', fullName: 'Kvindesland, Per Øystein', ansattNr: '15375', ressursNr: '605232', balance: 0 },
        { firstName: 'Maja Johanne', fullName: 'Mathisen, Maja Johanne Sandbekklien', ansattNr: '650673', ressursNr: '650673', balance: 0 },
        { firstName: 'Ingvald', fullName: 'Nordmark, Ingvald', ansattNr: '15351', ressursNr: '603352', balance: 0 },
        { firstName: 'Håkon', fullName: 'Norheim, Håkon Jonassen', ansattNr: '648304', ressursNr: '648304', balance: 0 },
        { firstName: 'Elise', fullName: 'Pedersen, Elise', ansattNr: '648191', ressursNr: '648191', balance: 0 },
        { firstName: 'Torkel', fullName: 'Schibevaag, Torkel Anstensrud', ansattNr: '637598', ressursNr: '637598', balance: 0 },
        { firstName: 'Erik', fullName: 'Waage, Erik', ansattNr: '18025', ressursNr: '608201', balance: 0 },
        { firstName: 'Fride', fullName: 'Westvik, Fride Audunsdotter', ansattNr: '30936', ressursNr: '625038', balance: 0 },
        { firstName: 'Adrian', fullName: 'Årthun, Adrian Fosse', ansattNr: '654342', ressursNr: '654342', balance: 0 },
        { firstName: 'Torkel', fullName: 'Gidske, Torkel', ansattNr: '647786', ressursNr: '647786', balance: 0 },
        { firstName: 'Torill', fullName: 'Mjølsnes, Torill', ansattNr: '23748', ressursNr: '23748', balance: 0 },
        { firstName: 'Pål', fullName: 'Mortensen, Pål Berg', ansattNr: '634794', ressursNr: '634794', balance: 0 },
        { firstName: 'Jonna', fullName: 'Dunfjeld-Mølnvik, Jonna', ansattNr: '648856', ressursNr: '648856', balance: 0 }
      ];

      for (const item of MENU_ITEMS) {
        batch.set(db.collection('menu').doc(), item);
      }
      for (const u of usersToSeed) {
        batch.set(db.collection('users').doc(), u);
      }
      
      await batch.commit();
      res.json({ success: true, message: "Database seeded successfully" });
    } catch (err: any) {
      console.error("Seeding failed", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
      });
}

startServer();
