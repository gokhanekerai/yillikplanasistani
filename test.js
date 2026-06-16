const getMonthName = (m) => {
    const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    return months[m];
};

let currentDate = new Date(2026, 8, 14); // 14 Eylul
let end = new Date(2026, 8, 20);

let currentWeek = {days:[]};
let weeks = [];

while(currentDate <= end) {
    let dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 1 && currentWeek.days.length > 0) {
        weeks.push(currentWeek);
        currentWeek = {days:[]};
    }
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        currentWeek.days.push({
            date: new Date(currentDate),
            dateStr: currentDate.toLocaleDateString('tr-TR')
        });
    }
    currentDate.setDate(currentDate.getDate() + 1);
}
if (currentWeek.days.length > 0) weeks.push(currentWeek);

console.log(JSON.stringify(weeks, null, 2));
