import fs from "fs";

let file = fs.readFileSync("server.ts", "utf8");

// Remove resend imports and references
file = file.replace(/import \{ Resend \} from "resend";\n/g, '');
file = file.replace(/let resendClient: Resend \| null = null;[\s\S]*?return resendClient;\n\}\n/g, '');

file = file.replace(/import cron, \{ ScheduledTask \} from "node-cron";\n/, '');
file = file.replace(/let activeCronJob: ScheduledTask \| null = null;[\s\S]*?kl 08:00\)`\);\n\}\n/g, '');

// Don't call setupCronJob anymore
file = file.replace(/setupCronJob\(\);\n/g, '');

// Import Google APIs
const googleImports = `import { google } from 'googleapis';\nimport { getAdminDb } from "./src/lib/firebaseAdmin.js";\n`;
file = file.replace(/import \{ getAdminDb \} from "\.\/src\/lib\/firebaseAdmin\.js";/, googleImports);

// Replace sendMonthlyEmail with new google logic
const googleLogic = `
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
            title: \`Kantineoppgjør - \${monthName}\`
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
            \`Kantinetrekk \${currentMonthWord}\`, 
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
    const utf8Subject = \`=?utf-8?B?\${Buffer.from(subject).toString('base64')}?=\`;
    let messageBody = \`To: \${recipients.join(', ')}\\r\\n\`;
    messageBody += \`Subject: \${utf8Subject}\\r\\n\`;
    messageBody += \`Content-Type: text/html; charset=utf-8\\r\\n\\r\\n\`;
    
    let htmlContent = html;
    if (sheetUrl) {
      htmlContent += \`<br><hr><br><h3>Dokumentasjon</h3><p>Du finner månedens oppgjør i dette automatisk opprettede regnearket:</p><p><a href="\${sheetUrl}">Åpne Google Sheet med oppgjør</a></p>\`;
    }

    messageBody += htmlContent;

    const encodedMessage = Buffer.from(messageBody)
      .toString('base64')
      .replace(/\\+/g, '-')
      .replace(/\\//g, '_')
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
        console.log(\`Nullstilte saldoen for \${resetCount} brukere i bakgrunnen.\`);
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
`;

file = file.replace(/async function sendMonthlyEmail\([\s\S]*?\}\n\}/, googleLogic);

// Modify generateEmailContent to return toInvoice
file = file.replace(/      text,\n      html,\n      csvContent\n    \};\n/g, '      text,\n      html,\n      csvContent,\n      toInvoice\n    };\n');
file = file.replace(/async function generateEmailContent\(\): Promise<\{ subject: string; html: string; text: string; csvContent\?: string \}> \{/, 'async function generateEmailContent(): Promise<{ subject: string; html: string; text: string; csvContent?: string, toInvoice: any[] }> {');

// Modify the trigger route
const triggerRoute = `
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
      res.json({ success: true, data: sendRes.data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

file = file.replace(/app\.post\("\/api\/trigger-monthly-email", async \(req, res\) => \{[\s\S]*?\}\n  \}\);/, triggerRoute.trim());

fs.writeFileSync("server.ts", file);
