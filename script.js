// script.js — Hotel MVSA Advanced Multi-room Quote Tool
// 注意：請在上線前檢查 PRICE_DATA 與 RULES 是否完全吻合你的正式表格。
// 以下已把「不含早 / 含1早 / 含2早」的三組價格結構化（weekday/weekend/peak/specialPeak）
// 若要改價直接修改下面 PRICE_DATA 即可。

/* =========================
   PRICE_DATA 格式說明
   PRICE_DATA = {
     "Room Name": {
        rates: {
           weekday: { no: 0, b1: 0, b2: 0 },
           weekend: { no: 0, b1: 0, b2: 0 },
           peak: { no: 0, b1: 0, b2: 0 },
           specialPeak: { no: null, b1: null, b2: null } // null 表示「業務另行報價」
        },
        paxInfo: { maxAdults: 2 }
     }
   }
   ========================= */

// ---------------------
// 1) 初始價格（請核對並修改）
// ---------------------
const PRICE_DATA = {
  "Urban Deluxe (都會客房)": {
    rates:{
      weekday: { no: 5200, b1: 5700, b2: 6200 },
      weekend: { no: 6200, b1: 6700, b2: 7200 },
      peak:    { no: 6700, b1: 7200, b2: 7700 },
      specialPeak: { no: null, b1: null, b2: null }
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Studio（繆思）一大床": {
    rates:{
      weekday: { no: 7500, b1: 8000, b2: 8500 },
      weekend: { no: 8000, b1: 8500, b2: 9000 },
      peak:    { no: 8500, b1: 9000, b2: 9500 },
      specialPeak: { no: null, b1: null, b2: null }
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Studio（繆思）三床": {
    rates:{
      weekday: { no: 8000, b1: 8500, b2: 9000 },
      weekend: { no: 8500, b1: 9000, b2: 9500 },
      peak:    { no: 9000, b1: 9500, b2:10000 },
      specialPeak: { no: null, b1: null, b2: null }
    },
    paxInfo:{ maxAdults:4 }
  },
  "Sky Villa（天際別墅）": {
    rates:{
      weekday: { no:13700, b1:14200, b2:14700 },
      weekend: { no:14700, b1:15200, b2:15700 },
      peak:    { no:16700, b1:17200, b2:17700 },
      specialPeak: { no:36800, b1:36800, b2:36800 } // PDF 有特旺價，示範放入
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Villa（大地別墅）": {
    rates:{
      weekday:{ no:15900, b1:16400, b2:16900 },
      weekend:{ no:18400, b1:18900, b2:19400 },
      peak:   { no:18900, b1:19400, b2:19900 },
      specialPeak:{ no:32800, b1:32800, b2:32800 }
    },
    paxInfo:{ maxAdults:2 }
  },
  "Winery Deluxe（酒莊客房）":{
    rates:{
      weekday:{ no:16800, b1:17300, b2:17800 },
      weekend:{ no:16800, b1:17300, b2:17800 },
      peak:   { no:16800, b1:17300, b2:17800 },
      specialPeak:{ no:null, b1:null, b2:null }
    },
    paxInfo:{ maxAdults:2 }
  }
};

// ---------------------
// 2) 加購餐飲（若需單獨加購，可在此計價）
// ---------------------
const ADDONS = {
  // 來源示例：PDF 提供兒童早餐 $640 +10%；成人餐飲另有價
  breakfastChildNet: 640, // net
  breakfastAdultNet: 1580, // 若要單買成人早餐使用（但我們已把含早價格放在 PRICE_DATA）
  dinnerAdultNet: 1280,
  svc: 0.10
};

// ---------------------
// 3) 平/假/旺/特旺 規則（由你上傳 PDF 範例整理）
//    如需補充特殊節日請直接在 RULES 裡加入日期或範圍。
// ---------------------
const RULES = {
  specialPeakRanges:[
    ["2026-12-28","2026-12-31"],
    ["2026-06-19","2026-06-21"], // 端午
    ["2026-09-25","2026-09-28"]  // 中秋延伸範圍
  ],
  peakDates:[
    "2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20",
    "2026-02-28","2026-04-05","2026-06-20","2026-09-26","2026-09-27",
    "2026-10-10","2026-10-25","2026-12-26"
  ],
  weekendExtraHolidays:[
    "2026-01-01","2026-09-02","2026-09-03"
  ]
};

// ---------------------
// 工具函式
// ---------------------
function asDate(s){ return new Date(s + "T00:00:00"); }
function formatYMD(d){ return d.toISOString().slice(0,10); }
function inRanges(dateStr, ranges){
  const d = asDate(dateStr);
  for(const r of ranges){
    if(d >= asDate(r[0]) && d <= asDate(r[1])) return true;
  }
  return false;
}

function classifyDate(dateStr){
  // priority specialPeak -> peak -> weekend hol -> Fri/Sat -> weekday
  if(inRanges(dateStr, RULES.specialPeakRanges)) return "specialPeak";
  if(RULES.peakDates.includes(dateStr)) return "peak";
  if(RULES.weekendExtraHolidays.includes(dateStr)) return "weekend";
  const day = asDate(dateStr).getDay(); // 0 Sun ... 6 Sat
  if(day === 5 || day === 6) return "weekend"; // Fri/Sat = 假日
  return "weekday";
}

function iterateNights(start, end){
  const arr = [];
  let cur = asDate(start);
  const endd = asDate(end);
  while(cur < endd){
    arr.push(formatYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

function money(n){ return "NT$ " + Number(n).toLocaleString(); }

// ---------------------
// UI: 新增 / 移除 房型列，並計算每列小計 & 全部合計
// ---------------------
const template = document.getElementById("roomRowTemplate");
const roomsArea = document.getElementById("roomsArea");
const addRoomBtn = document.getElementById("addRoomBtn");
const calcAllBtn = document.getElementById("calcAllBtn");
const resultBox = document.getElementById("resultBox");
const globalCheckin = document.getElementById("globalCheckin");
const globalCheckout = document.getElementById("globalCheckout");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const memoInput = document.getElementById("memo");

function createRoomRow(){
  const clone = template.content.firstElementChild.cloneNode(true);
  // populate room types
  const sel = clone.querySelector(".roomType");
  Object.keys(PRICE_DATA).forEach(k=>{
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });

  // attach events
  const inputs = clone.querySelectorAll("select, input");
  inputs.forEach(i => {
    i.addEventListener("change", ()=> computeRowSubtotal(clone));
  });

  const removeBtn = clone.querySelector(".removeBtn");
  removeBtn.addEventListener("click", ()=>{
    clone.remove();
    computeAll();
  });

  roomsArea.appendChild(clone);
  computeRowSubtotal(clone);
  return clone;
}

function computeRowSubtotal(rowEl){
  const roomType = rowEl.querySelector(".roomType").value;
  const count = Number(rowEl.querySelector(".roomCount").value || 1);
  const adults = Number(rowEl.querySelector(".roomAdults").value || 1);
  const children = Number(rowEl.querySelector(".roomChildren").value || 0);
  const breakfastOpt = rowEl.querySelector(".roomBreakfast").value; // no / b1 / b2
  const addDinner = rowEl.querySelector(".roomDinner").checked;

  const checkin = globalCheckin.value;
  const checkout = globalCheckout.value;
  if(!checkin || !checkout) {
    rowEl.querySelector(".rowSubtotal").textContent = "NT$ 0";
    return;
  }
  if(asDate(checkin) >= asDate(checkout)){
    rowEl.querySelector(".rowSubtotal").textContent = "日期錯誤";
    return;
  }
  const roomObj = PRICE_DATA[roomType];
  const nights = iterateNights(checkin, checkout);

  let subtotal = 0;
  let hasSpecial = false;

  nights.forEach(d=>{
    const cat = classifyDate(d);
    const rateGroup = roomObj.rates[cat] || roomObj.rates.weekday;
    // map breakfastOpt -> key
    const key = (breakfastOpt === "no") ? "no" : (breakfastOpt === "b1" ? "b1" : "b2");
    const price = rateGroup[key];
    if(price === null || price === undefined){
      hasSpecial = true;
    } else {
      subtotal += price * count;
    }
    // dinner add-on: use ADDONS.dinnerAdultNet + svc per adult per room for entire stay
  });

  // dinner add-on (per night)
  if(addDinner){
    const dprice = Math.round(ADDONS.dinnerAdultNet * (1+ADDONS.svc));
    subtotal += dprice * adults * count * nights.length;
  }

  // write subtotal display
  rowEl.querySelector(".rowSubtotal").text
