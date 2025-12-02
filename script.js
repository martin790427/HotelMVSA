// ===========================================
//   Hotel MVSA — 同業報價試算（進階版）
// ===========================================
// 房價資料、平假旺日規則全在這裡
// ===========================================

// ==============================
// 1) 房價資料 PRICE_DATA
// ==============================
const PRICE_DATA = {
  "Urban Deluxe (都會客房)": {
    net: { weekday: 5200, weekend: 6200, peak: 6700, specialPeak: null },
    paxInfo: { maxAdults: 2 }
  },
  "The Studio（繆思）一大床": {
    net: { weekday: 7500, weekend: 8000, peak: 8500, specialPeak: null },
    paxInfo: { maxAdults: 2 }
  },
  "The Studio（繆思）三床": {
    net: { weekday: 8000, weekend: 8500, peak: 9000, specialPeak: null },
    paxInfo: { maxAdults: 4 }
  },
  "Sky Villa（天際別墅）": {
    net: { weekday: 13700, weekend: 14700, peak: 16700, specialPeak: 36800 },
    paxInfo: { maxAdults: 2 }
  },
  "The Villa（大地別墅）": {
    net: { weekday: 15900, weekend: 18400, peak: 18900, specialPeak: 32800 },
    paxInfo: { maxAdults: 2 }
  },
  "Winery Deluxe（酒莊客房）": {
    net: { weekday: 16800, weekend: 16800, peak: 16800, specialPeak: null },
    paxInfo: { maxAdults: 2 }
  }
};

// ==============================
// 2) 加購品項（含服務費）
// ==============================
const ADD_ONS = {
  breakfastChildNet: 640,       // +10%
  breakfastAdultNet: 1580,       // +10%
  dinnerAdultNet: 1280,          // +10%
  service: 0.10
};

// ==============================
// 3) 日期分類規則（平假旺特旺）
// ==============================
const RULES = {
  specialPeakRanges: [
    ["2026-12-28", "2026-12-31"], // 特旺日（業務另報）
    ["2026-06-19","2026-06-21"],  // 端午連假
    ["2026-09-25","2026-09-28"]   // 中秋
  ],
  peakDates: [
    "2026-02-16","2026-02-17","2026-02-18","2026-02-19",
    "2026-02-20","2026-02-28","2026-04-05",
    "2026-06-20","2026-09-26","2026-09-27",
    "2026-10-10","2026-10-25","2026-12-26"
  ],
  weekendDates: [
    "2026-01-01","2026-09-02","2026-09-03"
  ]
};

// ==============================
// 工具函式
// ==============================
function asDate(s){ return new Date(s+"T00:00:00"); }

function inRanges(dateStr, ranges){
  const d = asDate(dateStr);
  for(const r of ranges){
    if(d >= asDate(r[0]) && d <= asDate(r[1])) return true;
  }
  return false;
}

function classifyDate(dateStr){
  if(inRanges(dateStr, RULES.specialPeakRanges)) return "specialPeak";
  if(RULES.peakDates.includes(dateStr)) return "peak";
  if(RULES.weekendDates.includes(dateStr)) return "weekend";

  const day = asDate(dateStr).getDay();
  if(day === 5 || day === 6) return "weekend"; // Fri/Sat = 假日

  return "weekday";
}

function eachDate(checkin, checkout){
  const out = [];
  let cur = asDate(checkin);
  const end = asDate(checkout);
  while(cur < end){
    out.push(cur.toISOString().slice(0,10));
    cur.setDate(cur.getDate()+1);
  }
  return out;
}

function money(n){ return "NT$ " + n.toLocaleString(); }

// ==============================
// 主計算邏輯
// ==============================
function calcTotal(){
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const roomType = document.getElementById("roomType").value;
  const rooms = Number(document.getElementById("rooms").value);
  const adults = Number(document.getElementById("adults").value);
  const children = Number(document.getElementById("children").value);
  const breakfast = Number(document.getElementById("breakfast").value);
  const addDinner = document.getElementById("addDinner").checked;

  if(!checkin || !checkout) return alert("請輸入入住 / 退房日期");
  if(asDate(checkin) >= asDate(checkout)) return alert("退房日必須晚於入住日");

  const room = PRICE_DATA[roomType];
  const nights = eachDate(checkin, checkout);

  let totalRoom = 0;
  let breakdown = [];
  let hasSpecial = false;

  nights.forEach(d => {
    const cat = classifyDate(d);
    let price = room.net[cat];

    if(cat==="specialPeak" && price===null){
      hasSpecial = true;
      breakdown.push({date:d, note:"特旺日（需另報價）"});
      return;
    }

    breakdown.push({
      date:d,
      cat,
      price,
      subtotal: price * rooms
    });

    totalRoom += price * rooms;
  });

  // 早餐
  let breakfastTotal = 0;
  if(breakfast > 0){
    const adt = Math.round(ADD_ONS.breakfastAdultNet * (1+ADD_ONS.service));
    const cht = Math.round(ADD_ONS.breakfastChildNet * (1+ADD_ONS.service));
    breakfastTotal = rooms * (adults*adt + children*cht);
  }

  // 晚餐
  let dinnerTotal = 0;
  if(addDinner){
    const dnn = Math.round(ADD_ONS.dinnerAdultNet * (1+ADD_ONS.service));
    dinnerTotal = rooms * adults * dnn;
  }

  return {
    checkin, checkout, nights:nights.length, rooms,
    adults, children, roomType,
    breakdown, totalRoom,
    breakfastTotal, dinnerTotal,
    grand: totalRoom + breakfastTotal + dinnerTotal,
    hasSpecial
  };
}

// ==============================
// 顯示結果
// ==============================
function showRes(r){
  const o = document.getElementById("output");
  if(!r){ o.textContent=""; return;}

  let t = "";
  t += `入住：${r.checkin}   退房：${r.checkout}   (共 ${r.nights} 晚)\n`;
  t += `房型：${r.roomType}  房數：${r.rooms}\n`;
  t += `成人：${r.adults}  兒童：${r.children}\n\n`;

  t += "【每日明細】\n";
  r.breakdown.forEach(b=>{
    if(b.note){
      t += `${b.date}：${b.note}\n`;
    }else{
      t += `${b.date}：${b.cat} → ${money(b.price)} × ${r.rooms} = ${money(b.subtotal)}\n`;
    }
  });

  t += `\n房價小計：${money(r.totalRoom)}\n`;
  if(r.breakfastTotal>0) t += `早餐加購：${money(r.breakfastTotal)}\n`;
  if(r.dinnerTotal>0) t += `晚餐加購：${money(r.dinnerTotal)}\n`;

  t += `\n=============================\n`;
  t += `合計：${money(r.grand)}\n`;

  if(r.hasSpecial){
    t += "\n※ 含特旺日，請洽業務確認最終價格。\n";
  }

  o.textContent = t;
}

// ==============================
// 初始化
// ==============================
function populateRoomTypes(){
  const sel = document.getElementById("roomType");
  Object.keys(PRICE_DATA).forEach(k=>{
    const o = document.createElement("option");
    o.value = o.textContent = k;
    sel.appendChild(o);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  populateRoomTypes();

  document.getElementById("calcBtn").addEventListener("click", ()=>{
    const r = calcTotal();
    showRes(r);
  });

  document.getElementById("exportBtn").addEventListener("click", ()=>{
    const text = document.getElementById("output").textContent;
    navigator.clipboard.writeText(text);
    alert("已複製到剪貼簿");
  });
});
