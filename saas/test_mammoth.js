const mammoth = require('mammoth');
const fs = require('fs');
mammoth.convertToHtml({path: '../2024-2025 Görüntü Sistemleri 11 2025 2026.docx'}).then(r => {
    const html = r.value;
    const rows = html.split('</tr>');
    let grid = [];
    rows.forEach((row, R) => {
        if (R > 5) return;
        let C = 0;
        const cells = row.split('</td>');
        cells.pop();
        cells.forEach(cell => {
            while (grid[R] && grid[R][C] !== undefined) C++;
            let colspan = 1;
            let rowspan = 1;
            let matchC = cell.match(/colspan=\"(\d+)\"/);
            if(matchC) colspan = parseInt(matchC[1]);
            let matchR = cell.match(/rowspan=\"(\d+)\"/);
            if(matchR) rowspan = parseInt(matchR[1]);
            let text = cell.replace(/<[^>]+>/g, '').trim();
            for(let r=0; r<rowspan; r++){
                for(let c=0; c<colspan; c++){
                    if(!grid[R+r]) grid[R+r] = [];
                    grid[R+r][C+c] = text;
                }
            }
            C += colspan;
        });
    });
    let colMap = { ay: -1, tarih: -1, saat: -1 };
    for (let R = 0; R <= Math.min(5, grid.length - 1); ++R) {
        if(!grid[R]) continue;
        for (let C = 0; C < grid[R].length; ++C) {
            let v = grid[R][C];
            if (v) {
                const text = v.toUpperCase();
                if (text.includes('AY') && !text.includes('DETAY') && !text.includes('KAYNAK')) { colMap.ay = C; console.log(`AY found at R=${R}, C=${C} with text: ${text}`); }
                if (text.includes('TARİH') || text.includes('HAFTA')) colMap.tarih = C;
                if (text.includes('SAAT') || text.includes('SÜRE')) colMap.saat = C;
            }
        }
    }
    console.log("FINAL COLMAP:", colMap);
});
