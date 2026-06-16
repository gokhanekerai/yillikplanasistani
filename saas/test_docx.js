const fs = require('fs');
const mammoth = require('mammoth');
const XLSX = require('xlsx-js-style');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function run() {
  const fileBuffer = fs.readFileSync('backend/uploads/2024-2025 Görüntü Sistemleri 11 2025 2026.docx');
  const arrayBuffer = new Uint8Array(fileBuffer).buffer;

  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const rows = doc.querySelectorAll('tr');
    
    let maxC = 0;
    let grid = [];
    let merges = [];

    rows.forEach((tr, R) => {
      const cells = tr.querySelectorAll('td, th');
      let C = 0;
      cells.forEach((cell) => {
         while (grid[R] && grid[R][C] !== undefined) C++;
         
         let colspan = parseInt(cell.getAttribute('colspan')) || 1;
         let rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
         let text = cell.innerHTML.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();
         
         if (colspan > 1 || rowspan > 1) {
           merges.push({s: {r: R, c: C}, e: {r: R + rowspan - 1, c: C + colspan - 1}});
         }

         for(let r = 0; r < rowspan; r++) {
            for(let c = 0; c < colspan; c++) {
               if (!grid[R+r]) grid[R+r] = [];
               if (r === 0 && c === 0) {
                  grid[R+r][C+c] = { v: text, t: 's' };
               } else {
                  grid[R+r][C+c] = { v: "", t: 's', merged: true };
               }
            }
         }
         C += colspan;
      });
      if (C - 1 > maxC) maxC = C - 1;
    });
    
    let headerEndRow = 3;
    for (let R = 0; R < grid.length && R < 10; R++) {
       if (!grid[R]) continue;
       let rowStr = grid[R].map(c => c ? c.v : "").join(" ").toUpperCase();
       if (rowStr.includes("KAZANIM") || (rowStr.includes("AY") && rowStr.includes("HAFTA"))) {
          headerEndRow = R;
       }
    }

    let extractedRows = [];
    for (let R = 0; R < grid.length; R++) {
       let rowGrid = grid[R];
       if (!rowGrid) continue;
       
       let rowDataArray = [];
       let isHeader = false;
       
       for (let C = 0; C <= maxC; C++) {
          let cellObj = rowGrid[C];
          if (!cellObj) cellObj = { v: "", t: 's' };
          
          if (R <= headerEndRow) {
             isHeader = true;
          } else {
             if (!cellObj.merged) {
               rowDataArray.push(cellObj);
             }
          }
       }
       
       if (!isHeader && rowDataArray.length > 0) {
         let hasContent = false;
         for (let cell of rowDataArray) { if (cell && cell.v && String(cell.v).trim() !== "") hasContent = true; }
         if (hasContent) {
           let mappedObj = {};
           let targetC = 4;
           for (let k = 0; k < rowDataArray.length; k++) {
             mappedObj[targetC] = rowDataArray[k];
             targetC++;
           }
           extractedRows.push(mappedObj);
         }
       }
    }

    console.log("Extracted Rows Count:", extractedRows.length);
    if(extractedRows.length > 0) {
        console.log("First row data:", extractedRows[0]);
    }
    console.log("Success!");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
