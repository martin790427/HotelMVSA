// ============================================
// Hotel MVSA — 修正版 script.js（穩定初始化）
// ============================================

// ------------- PRICE_DATA（請務必檢查與更新） -------------
const PRICE_DATA = {
  "Urban Deluxe (都會客房)": {
    rates:{
      weekday: { no: 5000, b1& b2: 6200 },
      weekend: { no: 5500, b1& b2: 6700 },
      peak:    { no: 6000, b1& b2: 7200 },
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Studio（繆思家庭房）二中床": {
    rates:{
      weekday: { no: 8000, b1& b2: 10400 },
      weekend: { no: 8500, b1& b2: 10900 },
      peak:    { no: 9000, b1& b2: 11400 },
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Studio（繆思三人房）三小床": {
    rates:{
      weekday: { no: 7500, b1& b2: 9300 },
      weekend: { no: 8000, b1& b2: 9800 },
      peak:    { no: 8500, b1& b2: 10300 },
    },
    paxInfo:{ maxAdults:4 }
  },
  "Sky Villa（天際別墅）": {
    rates:{
      weekday: { no: 16700, b1& b2: 17900 },
      weekend: { no: 17200, b1& b2: 18400 },
      peak:    { no: 17700, b1& b2: 18900 },
    },
    paxInfo:{ maxAdults:2 }
  },
  "The Villa（大地別墅）": {
    rates:{
      weekday: { no: 13700, b1& b2: 14900 },
      weekend: { no: 14200, b1& b2: 15400 },
      peak:    { no: 14700, b1& b2: 15900 },
    },
    paxInfo:{ maxAdults:2 }
  },
  "Winery Deluxe（酒莊客房）":{
    rates:{
      weekday: { no: 5500, b1& b2: 6700 },
      weekend: { no: 6000, b1& b2: 7200 },
      peak:    { no: 6500, b1& b2: 7700 },
    },
    paxInfo:{ maxAdults:2 }
  }
};

// ---------- 加購餐飲（單買用；含早價格已內建於 PRICE_DATA） ----------
const ADDONS = { dinnerAdultNet:1280, breakfastChildNet:640, svc:0.10 };

// ---------- 平/假/旺/特旺 規則 ----------
const RULES = {
  specialPeakRanges:[
    ["2026-12-28","2026-12-31"],
    ["2026-06-19","2026-06-21"],
    ["2026-09-25","2026-09-28"]
  ],
  peakDates:[
    "2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20",
    "2026-02-28","2026-04-05","2026-06-20","2026-09-26","2026-09-27",
    "2026-10-10","2026-10-25","2026-12-26"
  ],
  weekendExtraHolidays:["2026-01-01","2026-09-02","2026-09-03"]
};

// ---------- 工具函式 ----------
function asDate(s){ return new Date(s + "T00:00:00"); }
function fmtYMD(d){ return d.toISOString().slice(0,10); }
function money(n){ return "NT$ " + Number(n).toLocaleString(); }
function inRanges(dateStr, ranges){
  const d = asDate(dateStr);
  for(const r of ranges) if(d >= asDate(r[0]) && d <= asDate(r[1])) return true;
  return false;
}
function classifyDate(dateStr){
  if(inRanges(dateStr, RULES.specialPeakRanges)) return "specialPeak";
  if(RULES.peakDates.includes(dateStr)) return "peak";
  if(RULES.weekendExtraHolidays.includes(dateStr)) return "weekend";
  const day = asDate(dateStr).getDay();
  if(day===5 || day===6) return "weekend";
  return "weekday";
}
function iterateNights(start, end){
  const arr=[]; let cur=asDate(start), endd=asDate(end);
  while(cur < endd){ arr.push(fmtYMD(cur)); cur.setDate(cur.getDate()+1); }
  return arr;
}

// ---------- 確保 DOM 元素在 load 後使用 ----------
document.addEventListener("DOMContentLoaded", ()=> {
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

  // 填充下拉選單（回傳一個 clone 裡的 select 元素）
  function populateSelectOptions(selectEl){
    selectEl.innerHTML = "";
    Object.keys(PRICE_DATA).forEach(k=>{
      const opt = document.createElement("option");
      opt.value = k; opt.textContent = k; selectEl.appendChild(opt);
    });
  }

  // 建立一列（含事件）
  function createRoomRow(){
    const node = template.content.firstElementChild.cloneNode(true);
    const sel = node.querySelector(".roomType");
    populateSelectOptions(sel);

    // 事件：任何欄位變動都會觸發本列小計計算
    const inputs = node.querySelectorAll("select, input");
    inputs.forEach(i => i.addEventListener("change", ()=> computeRowSubtotal(node)));

    // 移除按鈕
    node.querySelector(".removeBtn").addEventListener("click", ()=>{
      node.remove();
      computeAll();
    });

    roomsArea.appendChild(node);
    // initial compute
    computeRowSubtotal(node);
    return node;
  }

  // 計算單列小計（顯示在 UI）
  function computeRowSubtotal(rowEl){
    const checkin = globalCheckin.value;
    const checkout = globalCheckout.value;
    const roomType = rowEl.querySelector(".roomType").value;
    const count = Number(rowEl.querySelector(".roomCount").value || 1);
    const adults = Number(rowEl.querySelector(".roomAdults").value || 1);
    const children = Number(rowEl.querySelector(".roomChildren").value || 0);
    const breakfastOpt = rowEl.querySelector(".roomBreakfast").value; // no / b1 / b2
    const addDinner = rowEl.querySelector(".roomDinner").checked;

    const subtotalEl = rowEl.querySelector(".rowSubtotal");

    if(!checkin || !checkout){ subtotalEl.textContent = "NT$ 0"; return; }
    if(asDate(checkin) >= asDate(checkout)){ subtotalEl.textContent = "日期錯誤"; return; }

    const nights = iterateNights(checkin, checkout);
    const roomObj = PRICE_DATA[roomType];
    if(!roomObj){ subtotalEl.textContent = "未知房型"; return; }

    let subtotal = 0; let specialFlag = false;

    nights.forEach(d=>{
      const cat = classifyDate(d);
      const rateGroup = roomObj.rates[cat] || roomObj.rates.weekday;
      const key = (breakfastOpt==="no")?"no":(breakfastOpt==="b1"?"b1":"b2");
      const price = rateGroup[key];
      if(price === null || price === undefined){ specialFlag = true; }
      else subtotal += price * count;
    });

    if(addDinner){
      const perDinner = Math.round(ADDONS.dinnerAdultNet * (1+ADDONS.svc));
      subtotal += perDinner * adults * count * nights.length;
    }

    subtotalEl.textContent = specialFlag ? "含特旺日—請洽業務" : money(subtotal);
    computeAll(); // 更新總表
  }

  // 計算所有列並輸出詳細內容
  function computeAll(){
    const checkin = globalCheckin.value;
    const checkout = globalCheckout.value;
    if(!checkin || !checkout){ resultBox.textContent = "請先輸入入住/退房日期，並新增房型。"; return; }
    if(asDate(checkin) >= asDate(checkout)){ resultBox.textContent = "退房需晚於入住。"; return; }

    const rows = Array.from(roomsArea.querySelectorAll(".room-row"));
    if(rows.length === 0){ resultBox.textContent = "請新增房型列。"; return; }

    const nights = iterateNights(checkin, checkout);
    let grand = 0; let specialFlag=false;
    const lines = [];
    lines.push(`報價對象：${memoInput.value || "—"}`);
    lines.push(`入住：${checkin}  退房：${checkout}  共 ${nights.length} 晚`);
    lines.push("");

    rows.forEach((r, idx)=>{
      const roomType = r.querySelector(".roomType").value;
      const count = Number(r.querySelector(".roomCount").value || 1);
      const adults = Number(r.querySelector(".roomAdults").value || 1);
      const children = Number(r.querySelector(".roomChildren").value || 0);
      const breakfastOpt = r.querySelector(".roomBreakfast").value;
      const addDinner = r.querySelector(".roomDinner").checked;

      lines.push(`【房型 ${idx+1}】 ${roomType}  x ${count} 間`);
      lines.push(` 成人 ${adults}，兒童 ${children}，早餐 ${breakfastOpt==="no"?"不含早":(breakfastOpt==="b1"?"含1早":"含2早")}，晚餐 ${addDinner?"有":"無"}`);

      let roomSubtotal = 0;
      nights.forEach(d=>{
        const cat = classifyDate(d);
        const rateGroup = PRICE_DATA[roomType].rates[cat] || PRICE_DATA[roomType].rates.weekday;
        const key = (breakfastOpt==="no")?"no":(breakfastOpt==="b1"?"b1":"b2");
        const price = rateGroup[key];
        if(price === null || price === undefined){
          lines.push(
