import fs from "fs";

let file = fs.readFileSync("server.ts", "utf8");

file = file.replace(
  'export interface AppSettings {\n  cronDay: number;\n  recipients: string[];\n  threshold: number;\n}',
  'export interface AppSettings {\n  cronDay: number;\n  recipients: string[];\n  threshold: number;\n  productionNumber?: string;\n}'
);

file = file.replace(
  '    threshold: 200\n  };',
  '    threshold: 200,\n    productionNumber: ""\n  };'
);

file = file.replace(
  'async function generateEmailContent(): Promise<{ subject: string; html: string; text: string }> {',
  'async function generateEmailContent(): Promise<{ subject: string; html: string; text: string; csvContent?: string }> {'
);

file = file.replace(
  '      html += `</tbody></table>`;\n    }\n\n    return {\n      subject: `Kantineoppgjør (Automatisk trekk - ${toInvoice.length} ansatte)`,\n      text,\n      html\n    };\n',
  `      html += \`</tbody></table>\`;
    }

    let csvContent = "";
    if (toInvoice.length > 0) {
      csvContent += "\\uFEFF";
      csvContent += \`Produksjonsnummer:;\${settings.productionNumber || ''};Må utfylles\\n\`;
      csvContent += \`Dagens dato:;\${new Date().toLocaleDateString('nb-NO')};Må utfylles\\n\`;
      csvContent += \`\\n\`;
      csvContent += \`Ressnr;Tekst til lønnsslipp;Trekk;Notater\\n\`;
      
      const monthName = new Date().toLocaleString('nb-NO', { month: 'long' });
      toInvoice.forEach(user => {
        let trekkFormatert = user.balance.toFixed(2).replace('.', ',');
        csvContent += \`\${user.ressursNr};Kantinetrekk \${monthName};\${trekkFormatert};\${user.fullName}\\n\`;
      });
    }

    return {
      subject: \`Kantineoppgjør (Automatisk trekk - \${toInvoice.length} ansatte)\`,
      text,
      html,
      csvContent
    };
`
);

file = file.replace(
  '    const { subject, html, text } = await generateEmailContent();\n\n    const { data, error } = await resend.emails.send({\n      from: \'Oppgjør <onboarding@resend.dev>\', // Endre til ditt verifiserte domene hos Resend\n      to: recipients,\n      subject: subject,\n      html: html,\n      text: text,\n    });\n',
  `    const { subject, html, text, csvContent } = await generateEmailContent();

    const options: any = {
      from: 'Oppgjør <onboarding@resend.dev>',
      to: recipients,
      subject: subject,
      html: html,
      text: text,
    };

    if (csvContent) {
      options.attachments = [
        {
          filename: \`kantineoppgjor-\${new Date().toLocaleDateString('nb-NO').replace(/\\./g, '-')}.csv\`,
          content: Buffer.from(csvContent, 'utf-8')
        }
      ];
    }

    const { data, error } = await resend.emails.send(options);
`
);

// Replace /api/trigger-monthly-email
const triggerReplacement = `  app.post("/api/trigger-monthly-email", async (req, res) => {
    try {
      const settings = loadSettings();
      const sendRes = await sendMonthlyEmail(settings.recipients);
      if (sendRes.error) {
        return res.status(500).json({ error: typeof sendRes.error === 'string' ? sendRes.error : sendRes.error.message || 'Ukjent feil' });
      }
      res.json({ success: true, data: sendRes.data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

file = file.replace(/app\.post\("\/api\/trigger-monthly-email", async \(req, res\) => \{[\s\S]*?\} catch \(err: any\) \{\n      res\.status\(500\)\.json\(\{ error: err\.message \}\);\n    \}\n  \}\);/, triggerReplacement);

fs.writeFileSync("server.ts", file);
